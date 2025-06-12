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
          isDefault: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        tag: tagContent.tag,
        content: tagContent.content,
        isDefault: false,
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
  body('content').isString().isLength({ min: 1, max: 100000 }).withMessage('Content must be between 1 and 100000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const { content } = req.body;

    const tagContent = await TagContent.findOneAndUpdate(
      { userId: req.user._id, tag: tag },
      { content: content },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        tag: tagContent.tag,
        content: tagContent.content,
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
        updatedAt: tc.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching tag contents:', error);
    res.status(500).json({ error: 'Server error while fetching tag contents' });
  }
});

module.exports = router;