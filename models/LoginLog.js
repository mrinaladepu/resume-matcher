const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // ⬅ user is optional (for failed logins)
  },
  username: {
    type: String,
    required: true // ⬅ store attempted login input
  },
  success: {
    type: Boolean,
    default: false // ⬅ default false, set true on success
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip: String,
  userAgent: String
});

module.exports = mongoose.model('LoginLog', LoginLogSchema);
