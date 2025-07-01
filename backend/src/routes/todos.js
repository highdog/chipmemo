const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Todo = require('../models/Todo');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/todos
// @desc    Get todos for user
// @access  Private
router.get('/', [
  query('date').optional().isISO8601().withMessage('Date must be in ISO format'),
  query('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'none']).withMessage('Invalid priority'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { date, completed, category, priority } = req.query;

    // Build query
    const query = { userId: req.user._id };
    
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      query.$or = [
        {
          dueDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ];
    }

    const todos = await Todo.find(query)
      .populate('noteId', 'title')
      .sort({ completed: 1, priority: -1, order: 1, dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Debug: 记录从数据库获取的todos timer数据
    console.log('=== Backend GET /api/todos - Database Timer Data ===');
    todos.forEach((todo, index) => {
      console.log(`Todo ${index + 1} (${todo._id}):`, {
        text: todo.text?.substring(0, 30) + '...',
        timer: todo.timer,
        timerType: typeof todo.timer,
        timerKeys: todo.timer ? Object.keys(todo.timer) : 'no timer'
      });
    });
    console.log('=== End Backend Timer Debug ===');

    const total = await Todo.countDocuments(query);

    res.json({
      success: true,
      data: {
        todos,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching todos' });
  }
});

// @route   GET /api/todos/stats
// @desc    Get todo statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const stats = await Todo.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$completed', false] }, 1, 0] }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$completed', false] },
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$dueDate', null] }
                  ]
                },
                1,
                0
              ]
            }
          },
          dueToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$completed', false] },
                    {
                      $gte: [
                        '$dueDate',
                        new Date(new Date().setHours(0, 0, 0, 0))
                      ]
                    },
                    {
                      $lt: [
                        '$dueDate',
                        new Date(new Date().setHours(23, 59, 59, 999))
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      dueToday: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching todo stats' });
  }
});

// @route   POST /api/todos
// @desc    Create new todo
// @access  Private
router.post('/', [
  body('text')
    .notEmpty()
    .withMessage('Todo text is required')
    .isLength({ max: 500 })
    .withMessage('Todo text cannot exceed 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'none'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in ISO format'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.length > 30) {
            throw new Error('Each tag must be a string with max 30 characters');
          }
        }
      }
      return true;
    }),
  body('noteId')
    .optional()
    .isMongoId()
    .withMessage('Invalid note ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, priority, dueDate, category, noteId, tags } = req.body;
    const todoPriority = priority || 'medium';

    // 获取同优先级的最大order值
    const maxOrderTodo = await Todo.findOne({
      userId: req.user._id,
      priority: todoPriority,
      completed: false
    }).sort({ order: -1 });

    const nextOrder = maxOrderTodo ? (maxOrderTodo.order || 0) + 1 : 1;

    const todo = new Todo({
      text,
      priority: todoPriority,
      dueDate: dueDate || null,
      category: category || 'general',
      noteId: noteId || null,
      tags: tags || [],
      userId: req.user._id,
      order: nextOrder
    });

    await todo.save();
    await todo.populate('noteId', 'title');

    res.status(201).json({
      success: true,
      data: todo
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating todo' });
  }
});

// @route   POST /api/todos/batch
// @desc    Create multiple todos
// @access  Private
router.post('/batch', [
  body('todos')
    .isArray()
    .withMessage('Todos must be an array')
    .custom((todos) => {
      if (todos.length === 0) {
        throw new Error('Todos array cannot be empty');
      }
      if (todos.length > 100) {
        throw new Error('Cannot create more than 100 todos at once');
      }
      return true;
    }),
  body('todos.*.text')
    .notEmpty()
    .withMessage('Todo text is required')
    .isLength({ max: 500 })
    .withMessage('Todo text cannot exceed 500 characters'),
  body('todos.*.priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'none'])
    .withMessage('Invalid priority'),
  body('todos.*.dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in ISO format'),
  body('todos.*.category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('todos.*.noteId')
    .optional()
    .isMongoId()
    .withMessage('Invalid note ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { todos } = req.body;
    const createdTodos = [];
    const failedTodos = [];

    // 获取各优先级的当前最大order值
    const orderCounters = {
      low: 0,
      medium: 0,
      high: 0
    };

    for (const priority of ['low', 'medium', 'high', 'none']) {
      const maxOrderTodo = await Todo.findOne({
        userId: req.user._id,
        priority: priority,
        completed: false
      }).sort({ order: -1 });
      orderCounters[priority] = maxOrderTodo ? (maxOrderTodo.order || 0) : 0;
    }

    // 批量创建Todo
    for (let i = 0; i < todos.length; i++) {
      try {
        const { text, priority, dueDate, category, noteId, tags } = todos[i];
        const todoPriority = priority || 'medium';
        orderCounters[todoPriority]++;

        const todo = new Todo({
          text,
          priority: todoPriority,
          dueDate: dueDate || null,
          category: category || 'general',
          noteId: noteId || null,
          tags: tags || [],
          userId: req.user._id,
          order: orderCounters[todoPriority]
        });

        await todo.save();
        await todo.populate('noteId', 'title');
        createdTodos.push(todo);
      } catch (error) {
        failedTodos.push({
          index: i,
          todo: todos[i],
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdTodos,
        failed: failedTodos,
        summary: {
          total: todos.length,
          created: createdTodos.length,
          failed: failedTodos.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating todos' });
  }
});

// @route   PUT /api/todos/:id
// @desc    Update todo
// @access  Private
router.put('/:id', [
  body('text')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Todo text must be between 1 and 500 characters'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'none'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      if (!new Date(value).toISOString()) {
        throw new Error('Due date must be in ISO format');
      }
      return true;
    }),
  body('startDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      if (!new Date(value).toISOString()) {
        throw new Error('Start date must be in ISO format');
      }
      return true;
    }),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('noteId', 'title');

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating todo' });
  }
});

// @route   PATCH /api/todos/:id/toggle
// @desc    Toggle todo completion status
// @access  Private
router.patch('/:id/toggle', async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await todo.toggle();
    await todo.populate('noteId', 'title');

    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while toggling todo' });
  }
});

// @route   DELETE /api/todos/:id
// @desc    Delete todo
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting todo' });
  }
});

// @route   PATCH /api/todos/:id/reorder
// @desc    Reorder todo within same priority
// @access  Private
router.patch('/:id/reorder', [
  body('direction')
    .isIn(['up', 'down'])
    .withMessage('Direction must be "up" or "down"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { direction } = req.body;
    const todoId = req.params.id;

    // 找到当前todo
    const currentTodo = await Todo.findOne({
      _id: todoId,
      userId: req.user._id
    });

    if (!currentTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // 获取同优先级的所有todos，按order排序
    const samePriorityTodos = await Todo.find({
      userId: req.user._id,
      priority: currentTodo.priority,
      completed: currentTodo.completed
    }).sort({ order: 1, createdAt: 1 });

    // 找到当前todo在列表中的索引
    const currentIndex = samePriorityTodos.findIndex(todo => todo._id.toString() === todoId);
    
    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Todo not found in priority group' });
    }

    let targetIndex;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
      if (targetIndex < 0) {
        return res.status(400).json({ error: 'Cannot move up, already at top' });
      }
    } else {
      targetIndex = currentIndex + 1;
      if (targetIndex >= samePriorityTodos.length) {
        return res.status(400).json({ error: 'Cannot move down, already at bottom' });
      }
    }

    // 交换order值
    const targetTodo = samePriorityTodos[targetIndex];
    const currentOrder = currentTodo.order;
    const targetOrder = targetTodo.order;

    await Todo.updateOne(
      { _id: currentTodo._id },
      { order: targetOrder }
    );

    await Todo.updateOne(
      { _id: targetTodo._id },
      { order: currentOrder }
    );

    // 返回更新后的todo
    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: `Todo moved ${direction} successfully`
    });
  } catch (error) {
    console.error('Error reordering todo:', error);
    res.status(500).json({ error: 'Server error while reordering todo' });
  }
});

// @route   GET /api/todos/categories
// @desc    Get all categories for user
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    const categories = await Todo.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching categories' });
  }
});



// @route   PATCH /api/todos/:id/set-order
// @desc    Set specific order for a todo and adjust others
// @access  Private
router.patch('/:id/set-order', [
  body('order').isInt({ min: 1 }).withMessage('Order must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { order: targetOrder } = req.body;
    
    // 查找当前todo
    const currentTodo = await Todo.findOne({ _id: id, userId: req.user._id });
    if (!currentTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    // 查找同优先级和完成状态的所有todos
    const samePriorityTodos = await Todo.find({
      userId: req.user._id,
      priority: currentTodo.priority,
      completed: currentTodo.completed
    }).sort({ order: 1 });
    
    // 验证目标序号是否有效
    if (targetOrder > samePriorityTodos.length) {
      return res.status(400).json({ error: 'Target order exceeds maximum allowed value' });
    }
    
    // 获取当前todo在排序列表中的位置
    const currentIndex = samePriorityTodos.findIndex(todo => todo._id.toString() === id);
    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Todo not found in priority group' });
    }
    
    // 如果目标序号和当前序号相同，无需操作
    if (targetOrder === currentIndex + 1) {
      return res.json({
        success: true,
        data: currentTodo
      });
    }
    
    // 重新分配序号
    const bulkOps = [];
    
    // 移除当前todo从列表
    const todosWithoutCurrent = samePriorityTodos.filter(todo => todo._id.toString() !== id);
    
    // 在目标位置插入当前todo
    const reorderedTodos = [...todosWithoutCurrent];
    reorderedTodos.splice(targetOrder - 1, 0, currentTodo);
    
    // 为所有todos分配新的order值
    reorderedTodos.forEach((todo, index) => {
      bulkOps.push({
        updateOne: {
          filter: { _id: todo._id, userId: req.user._id },
          update: { $set: { order: index + 1 } }
        }
      });
    });
    
    // 执行批量更新
    await Todo.bulkWrite(bulkOps);
    
    // 返回更新后的todo
    const updatedTodo = await Todo.findById(id);
    
    res.json({
      success: true,
      data: updatedTodo
    });
  } catch (error) {
    console.error('Error in set order:', error);
    res.status(500).json({ error: 'Server error while setting todo order' });
  }
});

// @route   POST /api/todos/:id/subtodos
// @desc    Add subtodo to a todo
// @access  Private
router.post('/:id/subtodos', [
  body('text')
    .notEmpty()
    .withMessage('Subtodo text is required')
    .isLength({ max: 300 })
    .withMessage('Subtodo text cannot exceed 300 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text } = req.body;
    const todoId = req.params.id;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const newSubtodo = {
      text,
      completed: false,
      createdAt: new Date()
    };

    todo.subtodos.push(newSubtodo);
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.status(201).json({
      success: true,
      data: updatedTodo,
      message: 'Subtodo added successfully'
    });
  } catch (error) {
    console.error('Error adding subtodo:', error);
    res.status(500).json({ error: 'Server error while adding subtodo' });
  }
});

// @route   PATCH /api/todos/:id/subtodos/:subtodoId/toggle
// @desc    Toggle subtodo completion status
// @access  Private
router.patch('/:id/subtodos/:subtodoId/toggle', async (req, res) => {
  try {
    const { id: todoId, subtodoId } = req.params;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const subtodo = todo.subtodos.id(subtodoId);
    if (!subtodo) {
      return res.status(404).json({ error: 'Subtodo not found' });
    }

    subtodo.completed = !subtodo.completed;
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Subtodo status updated successfully'
    });
  } catch (error) {
    console.error('Error toggling subtodo:', error);
    res.status(500).json({ error: 'Server error while toggling subtodo' });
  }
});

// @route   DELETE /api/todos/:id/subtodos/:subtodoId
// @desc    Delete a subtodo
// @access  Private
router.delete('/:id/subtodos/:subtodoId', async (req, res) => {
  try {
    const { id: todoId, subtodoId } = req.params;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const subtodo = todo.subtodos.id(subtodoId);
    if (!subtodo) {
      return res.status(404).json({ error: 'Subtodo not found' });
    }

    todo.subtodos.pull(subtodoId);
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Subtodo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subtodo:', error);
    res.status(500).json({ error: 'Server error while deleting subtodo' });
  }
});

// @route   PUT /api/todos/:id/subtodos/reorder
// @desc    Reorder subtodos
// @access  Private
router.put('/:id/subtodos/reorder', [
  body('subtodos')
    .isArray()
    .withMessage('Subtodos must be an array')
    .custom((subtodos) => {
      if (subtodos && subtodos.length > 0) {
        for (const subtodo of subtodos) {
          if (!subtodo._id || typeof subtodo.text !== 'string' || typeof subtodo.completed !== 'boolean') {
            throw new Error('Each subtodo must have _id, text, and completed fields');
          }
        }
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subtodos } = req.body;
    const todoId = req.params.id;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // 验证所有子待办事项ID是否存在
    const existingSubtodoIds = todo.subtodos.map(s => s._id.toString());
    const providedSubtodoIds = subtodos.map(s => s._id);
    
    if (existingSubtodoIds.length !== providedSubtodoIds.length) {
      return res.status(400).json({ error: 'Subtodo count mismatch' });
    }

    for (const id of providedSubtodoIds) {
      if (!existingSubtodoIds.includes(id)) {
        return res.status(400).json({ error: `Subtodo with id ${id} not found` });
      }
    }

    // 重新排序子待办事项
    todo.subtodos = subtodos.map(newSubtodo => {
      const existingSubtodo = todo.subtodos.find(s => s._id.toString() === newSubtodo._id);
      if (existingSubtodo) {
        existingSubtodo.text = newSubtodo.text;
        existingSubtodo.completed = newSubtodo.completed;
        return existingSubtodo;
      }
      return newSubtodo;
    });

    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Subtodos reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering subtodos:', error);
    res.status(500).json({ error: 'Server error while reordering subtodos' });
  }
});

// @route   POST /api/todos/:id/timer/start
// @desc    Start timer for a todo
// @access  Private
router.post('/:id/timer/start', async (req, res) => {
  try {
    const todoId = req.params.id;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    console.log('=== Backend Timer Start - Before ===');
    console.log('Todo timer before start:', todo.timer);

    // 如果计时器已经在运行，先停止并累加时间
    if (todo.timer.isRunning && todo.timer.startTime) {
      const elapsed = Math.floor((new Date() - todo.timer.startTime) / 1000);
      todo.timer.totalSeconds += elapsed;
    }

    todo.timer.isRunning = true;
    todo.timer.startTime = new Date();
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    console.log('=== Backend Timer Start - After ===');
    console.log('Updated todo timer:', updatedTodo.timer);
    console.log('=== End Timer Start Debug ===');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Timer started successfully'
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Server error while starting timer' });
  }
});

// @route   POST /api/todos/:id/timer/pause
// @desc    Pause timer for a todo
// @access  Private
router.post('/:id/timer/pause', async (req, res) => {
  try {
    const todoId = req.params.id;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // 如果计时器正在运行，累加已用时间
    if (todo.timer.isRunning && todo.timer.startTime) {
      const elapsed = Math.floor((new Date() - todo.timer.startTime) / 1000);
      todo.timer.totalSeconds += elapsed;
    }

    todo.timer.isRunning = false;
    todo.timer.startTime = null;
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Timer paused successfully'
    });
  } catch (error) {
    console.error('Error pausing timer:', error);
    res.status(500).json({ error: 'Server error while pausing timer' });
  }
});

// @route   POST /api/todos/:id/timer/reset
// @desc    Reset timer for a todo
// @access  Private
router.post('/:id/timer/reset', async (req, res) => {
  try {
    const todoId = req.params.id;

    const todo = await Todo.findOne({ _id: todoId, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    todo.timer.isRunning = false;
    todo.timer.totalSeconds = 0;
    todo.timer.startTime = null;
    await todo.save();

    const updatedTodo = await Todo.findById(todoId).populate('noteId', 'title');

    res.json({
      success: true,
      data: updatedTodo,
      message: 'Timer reset successfully'
    });
  } catch (error) {
    console.error('Error resetting timer:', error);
    res.status(500).json({ error: 'Server error while resetting timer' });
  }
});

module.exports = router;