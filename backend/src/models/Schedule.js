const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    trim: true
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['event', 'meeting', 'reminder', 'task'],
    default: 'event'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  externalId: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['local', 'google', 'apple', 'outlook'],
    default: 'local'
  }
}, {
  timestamps: true
});

// 创建索引
scheduleSchema.index({ userId: 1, date: 1 });
scheduleSchema.index({ userId: 1, createdAt: -1 });
scheduleSchema.index({ externalId: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);