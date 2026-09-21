const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filename: String,
  filepath: String,
  uploadedAt: { type: Date, default: Date.now },
  extractedText: String,
  authenticityScore: Number,
  isFake: { type: Boolean, default: false },
  analysis: {
    inconsistencies: [String],
    skillMismatch: [String],
    timelineIssues: [String],
    duplicateDetection: Boolean,
    aiJudgementText: String
  },
  legacyId: Number
});

module.exports = mongoose.model('Resume', ResumeSchema);
