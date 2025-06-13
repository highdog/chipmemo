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
  query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
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
      .sort({ completed: 1, priority: -1, dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in ISO format'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
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

    const todo = new Todo({
      text,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      category: category || 'general',
      noteId: noteId || null,
      tags: tags || [],
      userId: req.user._id
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
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in ISO format'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO format'),
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

module.exports = router;