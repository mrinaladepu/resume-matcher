const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  jobRole: String,
  jobDescription: String,
  similarityScore: Number,
  status: {
    type: String,
    enum: ['shortlisted', 'under review', 'rejected'],
    default: 'under review'
  },
  candidateDetails: {
    name: String,
    email: String,
    phone: String,
    skills: [String]
  },
  matchedSkills: [String],
  missingSkills: [String],
  strengths: [String],
  weaknesses: [String],
  recommendation: String,
  createdAt: { type: Date, default: Date.now },
  legacyId: Number
});

module.exports = mongoose.model('Match', MatchSchema);