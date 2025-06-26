const express = require('express');
const { body, param, validationResult } = require('express-validator');
const TagContent = require('../models/TagContent');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/tag-contents/:tag
// @desc    Get tag content for a specific tag
// @access  Private
router.get('/:tag', [
  param('tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const tagContent = await TagContent.findOne({ 
      userId: req.user._id, 
      tag: tag 
    });

    if (!tagContent) {
      return res.json({
        success: true,
        data: {
          tag: tag,
          content: `这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`,
          isDefault: true,
          isGoalEnabled: false,
          targetCount: 0,
          currentCount: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        tag: tagContent.tag,
        content: tagContent.content,
        isDefault: false,
        isGoalEnabled: tagContent.isGoalEnabled || false,
        targetCount: tagContent.targetCount || 0,
        currentCount: tagContent.currentCount || 0,
        updatedAt: tagContent.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching tag content:', error);
    res.status(500).json({ error: 'Server error while fetching tag content' });
  }
});

// @route   PUT /api/tag-contents/:tag
// @desc    Create or update tag content
// @access  Private
router.put('/:tag', [
  param('tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters'),
  body('content').isString().isLength({ min: 1, max: 100000 }).withMessage('Content must be between 1 and 100000 characters'),
  body('isGoalEnabled').optional().isBoolean().withMessage('isGoalEnabled must be a boolean'),
  body('targetCount').optional().isInt({ min: 0 }).withMessage('targetCount must be a non-negative integer'),
  body('currentCount').optional().isInt({ min: 0 }).withMessage('currentCount must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const { content, isGoalEnabled, targetCount, currentCount } = req.body;

    // 构建更新对象
    const updateData = { content };
    if (isGoalEnabled !== undefined) updateData.isGoalEnabled = isGoalEnabled;
    if (targetCount !== undefined) updateData.targetCount = targetCount;
    if (currentCount !== undefined) updateData.currentCount = currentCount;

    const tagContent = await TagContent.findOneAndUpdate(
      { userId: req.user._id, tag: tag },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        tag: tagContent.tag,
        content: tagContent.content,
        isGoalEnabled: tagContent.isGoalEnabled || false,
        targetCount: tagContent.targetCount || 0,
        currentCount: tagContent.currentCount || 0,
        updatedAt: tagContent.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving tag content:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Tag content already exists for this user' });
    }
    res.status(500).json({ error: 'Server error while saving tag content' });
  }
});

// @route   DELETE /api/tag-contents/:tag
// @desc    Delete tag content
// @access  Private
router.delete('/:tag', [
  param('tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const tagContent = await TagContent.findOneAndDelete({ 
      userId: req.user._id, 
      tag: tag 
    });

    if (!tagContent) {
      return res.status(404).json({ error: 'Tag content not found' });
    }

    res.json({
      success: true,
      message: 'Tag content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag content:', error);
    res.status(500).json({ error: 'Server error while deleting tag content' });
  }
});

// @route   POST /api/tag-contents/batch
// @desc    Create or update multiple tag contents
// @access  Private
router.post('/batch', [
  body('tagContents').isArray().withMessage('Tag contents must be an array'),
  body('tagContents.*.tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Each tag must be between 1 and 50 characters'),
  body('tagContents.*.content').isString().isLength({ min: 1, max: 100000 }).withMessage('Each content must be between 1 and 100000 characters'),
  body('tagContents.*.isGoalEnabled').optional().isBoolean().withMessage('isGoalEnabled must be a boolean'),
  body('tagContents.*.targetCount').optional().isInt({ min: 0 }).withMessage('targetCount must be a non-negative integer'),
  body('tagContents.*.currentCount').optional().isInt({ min: 0 }).withMessage('currentCount must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tagContents } = req.body;
    const results = {
      created: [],
      failed: []
    };

    for (const tagContentData of tagContents) {
      try {
        // 构建更新对象
        const updateData = { content: tagContentData.content };
        if (tagContentData.isGoalEnabled !== undefined) updateData.isGoalEnabled = tagContentData.isGoalEnabled;
        if (tagContentData.targetCount !== undefined) updateData.targetCount = tagContentData.targetCount;
        if (tagContentData.currentCount !== undefined) updateData.currentCount = tagContentData.currentCount;

        const tagContent = await TagContent.findOneAndUpdate(
          { userId: req.user._id, tag: tagContentData.tag },
          updateData,
          { new: true, upsert: true, runValidators: true }
        );

        results.created.push({
          tag: tagContent.tag,
          content: tagContent.content,
          isGoalEnabled: tagContent.isGoalEnabled || false,
          targetCount: tagContent.targetCount || 0,
          currentCount: tagContent.currentCount || 0,
          updatedAt: tagContent.updatedAt
        });
      } catch (error) {
        console.error(`Error saving tag content for tag ${tagContentData.tag}:`, error);
        results.failed.push({
          tag: tagContentData.tag,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          total: tagContents.length,
          created: results.created.length,
          failed: results.failed.length
        },
        created: results.created,
        failed: results.failed
      }
    });
  } catch (error) {
    console.error('Error in batch tag content creation:', error);
    res.status(500).json({ error: 'Server error while creating tag contents' });
  }
});

// @route   GET /api/tag-contents
// @desc    Get all tag contents for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const tagContents = await TagContent.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: tagContents.map(tc => ({
        tag: tc.tag,
        content: tc.content,
        updatedAt: tc.updatedAt,
        isGoalEnabled: tc.isGoalEnabled || false,
        targetCount: tc.targetCount || 0,
        currentCount: tc.currentCount || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching tag contents:', error);
    res.status(500).json({ error: 'Server error while fetching tag contents' });
  }
});

module.exports = router;