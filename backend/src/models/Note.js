const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [100000, 'Content cannot exceed 100000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    enum: ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
    default: 'default'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  customDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better search performance
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ userId: 1, title: 'text', content: 'text' });

// Unique index to prevent duplicate notes (same user, title, and content)
noteSchema.index({ userId: 1, title: 1, content: 1 }, { unique: true });

// Virtual for formatted date
noteSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Method to extract todos from content
noteSchema.methods.extractTodos = function() {
  const todoRegex = /^\s*[-*+]\s*\[([x\s])\]\s*(.+)$/gm;
  const todos = [];
  let match;
  
  while ((match = todoRegex.exec(this.content)) !== null) {
    todos.push({
      text: match[2].trim(),
      completed: match[1] === 'x',
      noteId: this._id
    });
  }
  
  return todos;
};

module.exports = mongoose.model('Note', noteSchema);