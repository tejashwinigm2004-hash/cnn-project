const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  timeSlot: { type: String, required: true }, // e.g. '10:00 AM - 10:30 AM'
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled'] }
}, { timestamps: true });

bookingSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
