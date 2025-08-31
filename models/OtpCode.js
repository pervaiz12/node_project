const mongoose = require('mongoose');

const OtpCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    // TTL index: document is removed at expiresAt
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OtpCode', OtpCodeSchema);
