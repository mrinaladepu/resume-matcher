const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // hashed
  email: String,
  role: { type: String, enum: ['admin', 'hr', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  legacyId: Number // optional: filled during migration
});

module.exports = mongoose.model('User', UserSchema);
