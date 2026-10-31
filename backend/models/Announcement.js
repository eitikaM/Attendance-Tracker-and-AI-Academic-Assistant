const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['General', 'Seminar', 'Exam', 'Notice'],
    default: 'General',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    default: 'CSE'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add index for better query performance
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ department: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
