const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Note = require('../models/Note');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/notes
// @desc    Get all notes for user
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('tags').optional().isString().withMessage('Tags must be a string'),
  query('archived').optional().isBoolean().withMessage('Archived must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, tags, archived } = req.query;

    // Build query
    const query = { userId: req.user._id };
    
    if (archived !== undefined) {
      query.isArchived = archived === 'true';
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (tagArray.length > 0) {
        query.tags = { $in: tagArray };
      }
    }

    let notes;
    if (search) {
      // Text search
      notes = await Note.find({
        ...query,
        $text: { $search: search }
      }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
      notes = await Note.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    const total = await Note.countDocuments(query);

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching notes' });
  }
});

// @route   GET /api/notes/:id
// @desc    Get single note
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching note' });
  }
});

// @route   POST /api/notes
// @desc    Create new note
// @access  Private
router.post('/', [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 100000 })
    .withMessage('Content cannot exceed 100000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('color')
    .optional()
    .isIn(['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
    .withMessage('Invalid color'),
  body('customDate')
    .optional()
    .isISO8601()
    .withMessage('Custom date must be a valid ISO 8601 date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, color, customDate } = req.body;

    const note = new Note({
      title,
      content,
      tags: tags || [],
      color: color || 'default',
      userId: req.user._id,
      customDate: customDate ? new Date(customDate) : null
    });

    // 如果指定了自定义日期，也设置createdAt
    if (customDate) {
      note.createdAt = new Date(customDate);
    }

    await note.save();

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating note' });
  }
});

// @route   POST /api/notes/batch
// @desc    Create multiple notes
// @access  Private
router.post('/batch', [
  body('notes')
    .isArray()
    .withMessage('Notes must be an array')
    .custom((notes) => {
      if (notes.length === 0) {
        throw new Error('Notes array cannot be empty');
      }
      if (notes.length > 500) {
        throw new Error('Cannot create more than 500 notes at once');
      }
      return true;
    }),
  body('notes.*.title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('notes.*.content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 100000 })
    .withMessage('Content cannot exceed 100000 characters'),
  body('notes.*.tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('notes.*.color')
    .optional()
    .isIn(['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
    .withMessage('Invalid color'),
  body('notes.*.customDate')
    .optional()
    .isISO8601()
    .withMessage('Custom date must be a valid ISO 8601 date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notes } = req.body;
    const createdNotes = [];
    const failedNotes = [];

    // 批量创建笔记
    for (let i = 0; i < notes.length; i++) {
      try {
        const { title, content, tags, color, customDate } = notes[i];

        // 检查是否存在重复笔记
        const existingNote = await Note.findOne({
          userId: req.user._id,
          title: title,
          content: content
        });

        if (existingNote) {
          console.log(`🔍 [笔记重复检查] 跳过重复笔记: ${title}`);
          failedNotes.push({
            index: i,
            note: notes[i],
            error: 'Duplicate note: A note with the same title and content already exists'
          });
          continue;
        }

        const note = new Note({
          title,
          content,
          tags: tags || [],
          color: color || 'default',
          userId: req.user._id,
          customDate: customDate ? new Date(customDate) : null
        });

        // 如果指定了自定义日期，也设置createdAt
        if (customDate) {
          note.createdAt = new Date(customDate);
        }

        await note.save();
        createdNotes.push(note);
      } catch (error) {
        console.log(`🔍 [笔记创建错误] 第${i+1}条笔记创建失败:`, error.message);
        
        // 检查是否是重复键错误
        if (error.code === 11000) {
          failedNotes.push({
            index: i,
            note: notes[i],
            error: 'Duplicate note: A note with the same title and content already exists'
          });
        } else {
          failedNotes.push({
            index: i,
            note: notes[i],
            error: error.message
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdNotes,
        failed: failedNotes,
        summary: {
          total: notes.length,
          created: createdNotes.length,
          failed: failedNotes.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating notes' });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update note
// @access  Private
router.put('/:id', [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be between 1 and 50000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('color')
    .optional()
    .isIn(['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
    .withMessage('Invalid color'),
  body('customDate')
    .optional()
    .isISO8601()
    .withMessage('Custom date must be a valid ISO 8601 date'),
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating note' });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete note
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // 先查找笔记以获取标签信息
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // 删除笔记
    await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    // 更新相关标签的打卡次数
    const TagContent = require('../models/TagContent');
    if (note.tags && note.tags.length > 0) {
      for (const tag of note.tags) {
        // 计算该标签下剩余的笔记数量
        const remainingNotesCount = await Note.countDocuments({
          userId: req.user._id,
          tags: tag
        });

        // 更新或创建标签内容，设置checkInCount为剩余笔记数量
        await TagContent.findOneAndUpdate(
          { userId: req.user._id, tag: tag },
          { 
            $set: { 
              checkInCount: remainingNotesCount
            }
          },
          { upsert: false } // 只更新已存在的标签内容
        );
      }
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Server error while deleting note' });
  }
});

// @route   GET /api/notes/tags/all
// @desc    Get all unique tags for user
// @access  Private
router.get('/tags/all', async (req, res) => {
  try {
    const tags = await Note.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching tags' });
  }
});

module.exports = router;