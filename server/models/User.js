const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
 role: { type: String, default: 'user' },
  pushToken: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);