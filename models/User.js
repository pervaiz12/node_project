const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
