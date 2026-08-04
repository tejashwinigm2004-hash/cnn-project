const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  role: { type: String, default: 'user' },
  pushToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  // Razorpay Customer ID — created once per user (see routes/paymentMethods.js).
  // Cards a user saves during checkout ("Save this card") get tokenized and
  // linked to this customer ID, which is how the Payment Methods list in
  // Settings knows which saved cards belong to them.
  razorpayCustomerId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);