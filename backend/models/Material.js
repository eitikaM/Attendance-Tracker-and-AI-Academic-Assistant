const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['syllabus', 'notes', 'timetable', 'pyqs'],
    required: true
  },
  subject: { type: String, required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  // New fields for AI chatbot
  extractedText: { type: String, default: '' }, // Extracted text content from the file
  textExtracted: { type: Boolean, default: false }, // Flag to indicate if text extraction was successful
  extractionError: { type: String, default: null } // Store any extraction errors
});

// Index for text search
materialSchema.index({ extractedText: 'text', title: 'text', description: 'text' });

module.exports = mongoose.model('Material', materialSchema);


