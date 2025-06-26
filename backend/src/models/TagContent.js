const mongoose = require('mongoose');

const tagContentSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: [true, 'Tag is required'],
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [100000, 'Content cannot exceed 100000 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 目标设置相关字段
  isGoalEnabled: {
    type: Boolean,
    default: false
  },
  targetCount: {
    type: Number,
    default: 0,
    min: [0, 'Target count cannot be negative']
  },
  currentCount: {
    type: Number,
    default: 0,
    min: [0, 'Current count cannot be negative']
  },
  // 打卡设置相关字段
  isCheckInEnabled: {
    type: Boolean,
    default: false
  },
  checkInCount: {
    type: Number,
    default: 0,
    min: [0, 'Check-in count cannot be negative']
  }
}, {
  timestamps: true
});

// 创建复合索引，确保每个用户的每个标签只有一个内容记录
tagContentSchema.index({ userId: 1, tag: 1 }, { unique: true });

// 添加文本搜索索引
tagContentSchema.index({ content: 'text' });

module.exports = mongoose.model('TagContent', tagContentSchema);