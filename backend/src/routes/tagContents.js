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
          currentCount: 0,
          isCheckInEnabled: false,
          checkInCount: 0
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
        isCheckInEnabled: tagContent.isCheckInEnabled || false,
        checkInCount: tagContent.checkInCount || 0,
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
  body('content').isString().isLength({ min: 0, max: 100000 }).withMessage('Content must be between 0 and 100000 characters'),
  body('isGoalEnabled').optional().isBoolean().withMessage('isGoalEnabled must be a boolean'),
  body('targetCount').optional().isInt({ min: 0 }).withMessage('targetCount must be a non-negative integer'),
  body('currentCount').optional().isInt({ min: 0 }).withMessage('currentCount must be a non-negative integer'),
  body('isCheckInEnabled').optional().isBoolean().withMessage('isCheckInEnabled must be a boolean'),
  body('checkInCount').optional().isInt({ min: 0 }).withMessage('checkInCount must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const { content, isGoalEnabled, targetCount, currentCount, isCheckInEnabled, checkInCount } = req.body;

    // 构建更新对象
    const updateData = { content };
    if (isGoalEnabled !== undefined) updateData.isGoalEnabled = isGoalEnabled;
    if (targetCount !== undefined) updateData.targetCount = targetCount;
    if (currentCount !== undefined) updateData.currentCount = currentCount;
    if (isCheckInEnabled !== undefined) updateData.isCheckInEnabled = isCheckInEnabled;
    if (checkInCount !== undefined) updateData.checkInCount = checkInCount;

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
        isCheckInEnabled: tagContent.isCheckInEnabled || false,
        checkInCount: tagContent.checkInCount || 0,
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
  body('tagContents.*.currentCount').optional().isInt({ min: 0 }).withMessage('currentCount must be a non-negative integer'),
  body('tagContents.*.isCheckInEnabled').optional().isBoolean().withMessage('isCheckInEnabled must be a boolean'),
  body('tagContents.*.checkInCount').optional().isInt({ min: 0 }).withMessage('checkInCount must be a non-negative integer')
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
        if (tagContentData.isCheckInEnabled !== undefined) updateData.isCheckInEnabled = tagContentData.isCheckInEnabled;
        if (tagContentData.checkInCount !== undefined) updateData.checkInCount = tagContentData.checkInCount;

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
          isCheckInEnabled: tagContent.isCheckInEnabled || false,
          checkInCount: tagContent.checkInCount || 0,
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
        currentCount: tc.currentCount || 0,
        isCheckInEnabled: tc.isCheckInEnabled || false,
        checkInCount: tc.checkInCount || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching tag contents:', error);
    res.status(500).json({ error: 'Server error while fetching tag contents' });
  }
});

// @route   PUT /api/tag-contents/:oldTag/rename
// @desc    Rename a tag and update all related content
// @access  Private
router.put('/:oldTag/rename', [
  param('oldTag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Old tag must be between 1 and 50 characters'),
  body('newTag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('New tag must be between 1 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { oldTag } = req.params;
    const { newTag } = req.body;
    const Note = require('../models/Note');

    // 检查新标签是否已存在
    const existingTagContent = await TagContent.findOne({
      userId: req.user._id,
      tag: newTag
    });

    if (existingTagContent) {
      return res.status(400).json({ error: '新标签名称已存在' });
    }

    // 更新标签内容
    const tagContent = await TagContent.findOneAndUpdate(
      { userId: req.user._id, tag: oldTag },
      { tag: newTag },
      { new: true }
    );

    if (!tagContent) {
      return res.status(404).json({ error: '标签内容不存在' });
    }

    // 更新所有包含该标签的笔记
    const notes = await Note.find({
      userId: req.user._id,
      tags: oldTag
    });

    for (const note of notes) {
      // 替换标签数组中的标签
      const updatedTags = note.tags.map(tag => tag === oldTag ? newTag : tag);
      
      // 替换内容中的标签
      const updatedContent = note.content.replace(
        new RegExp(`#${oldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g'),
        `#${newTag}`
      );
      
      await Note.findByIdAndUpdate(note._id, {
        tags: updatedTags,
        content: updatedContent
      });
    }

    res.json({
      success: true,
      data: {
        oldTag,
        newTag,
        updatedNotesCount: notes.length,
        tagContent: {
          tag: tagContent.tag,
          content: tagContent.content,
          isGoalEnabled: tagContent.isGoalEnabled || false,
          targetCount: tagContent.targetCount || 0,
          currentCount: tagContent.currentCount || 0,
          isCheckInEnabled: tagContent.isCheckInEnabled || false,
          checkInCount: tagContent.checkInCount || 0,
          updatedAt: tagContent.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error renaming tag:', error);
    res.status(500).json({ error: 'Server error while renaming tag' });
  }
});

// @route   GET /api/tag-contents/:tag/check-in-preview
// @desc    Preview check-in note content for a tag
// @access  Private
router.get('/:tag/check-in-preview', [
  param('tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    
    // 查找标签内容
    const tagContent = await TagContent.findOne({ 
      userId: req.user._id, 
      tag: tag 
    });

    if (!tagContent) {
      return res.status(404).json({ error: 'Tag content not found' });
    }

    if (!tagContent.isCheckInEnabled) {
      return res.status(400).json({ error: 'Check-in is not enabled for this tag' });
    }

    // 生成预览内容
    const currentDate = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    const previewCheckInCount = (tagContent.checkInCount || 0) + 1;
    const noteContent = `# ${tag}打卡\n\n**日期**: ${currentDate}\n\n**打卡次数**: 第${previewCheckInCount}次\n\n## 今日感想\n\n今天继续在 #${tag} 方面努力，这是第${previewCheckInCount}次打卡。\n\n## 收获与思考\n\n- \n- \n- \n\n---\n\n*坚持就是胜利！*`;
    
    res.json({
      success: true,
      data: {
        content: noteContent,
        title: `${tag}打卡`
      }
    });
  } catch (error) {
    console.error('Error previewing check-in for tag:', error);
    res.status(500).json({ error: 'Server error while previewing check-in' });
  }
});

// @route   POST /api/tag-contents/:tag/check-in
// @desc    Check in for a tag (increment check-in count and create note)
// @access  Private
router.post('/:tag/check-in', [
  param('tag').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('title').optional().isString().withMessage('Title must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tag } = req.params;
    const { content, title } = req.body;
    
    // 查找标签内容
    const tagContent = await TagContent.findOne({ 
      userId: req.user._id, 
      tag: tag 
    });

    if (!tagContent) {
      return res.status(404).json({ error: 'Tag content not found' });
    }

    if (!tagContent.isCheckInEnabled) {
      return res.status(400).json({ error: 'Check-in is not enabled for this tag' });
    }

    // 先增加打卡次数
    const updatedTagContent = await TagContent.findOneAndUpdate(
      { userId: req.user._id, tag: tag },
      { $inc: { checkInCount: 1 } },
      { new: true, runValidators: true }
    );
    
    const newCheckInCount = updatedTagContent.checkInCount;
    
    // 创建打卡笔记
    const Note = require('../models/Note');
    const noteContent = content || `${tag}打卡，已打卡${newCheckInCount}次`;
    const noteTitle = title || `${tag}打卡`;
    
    const note = new Note({
      title: noteTitle,
      content: noteContent,
      tags: [tag],
      userId: req.user._id,
      color: 'green'
    });

    await note.save();

    res.json({
      success: true,
      data: {
        tag: updatedTagContent.tag,
        checkInCount: updatedTagContent.checkInCount,
        note: {
          id: note._id,
          title: note.title,
          content: note.content,
          tags: note.tags
        }
      }
    });
  } catch (error) {
    console.error('Error checking in for tag:', error);
    res.status(500).json({ error: 'Server error while checking in' });
  }
});

module.exports = router;