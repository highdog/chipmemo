const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Todo text is required'],
    trim: true,
    maxlength: [500, 'Todo text cannot exceed 500 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'none'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  order: {
    type: Number,
    default: 0
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    datetime: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
todoSchema.index({ userId: 1, completed: 1, createdAt: -1 });
todoSchema.index({ userId: 1, dueDate: 1 });
todoSchema.index({ userId: 1, category: 1 });

// Virtual for overdue status
todoSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
});

// Virtual for due today status
todoSchema.virtual('isDueToday').get(function() {
  if (!this.dueDate || this.completed) return false;
  const today = new Date();
  const due = new Date(this.dueDate);
  return today.toDateString() === due.toDateString();
});

// Method to toggle completion status
todoSchema.methods.toggle = function() {
  this.completed = !this.completed;
  return this.save();
};

module.exports = mongoose.model('Todo', todoSchema);