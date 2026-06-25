const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { sendBookingNotificationEmail } = require('../utils/emailService');

// Fixed daily slots: 10:00 AM - 6:00 PM, 30-min blocks
const ALL_SLOTS = [
  '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM',
  '11:00 AM - 11:30 AM', '11:30 AM - 12:00 PM',
  '12:00 PM - 12:30 PM', '12:30 PM - 1:00 PM',
  '1:00 PM - 1:30 PM', '1:30 PM - 2:00 PM',
  '2:00 PM - 2:30 PM', '2:30 PM - 3:00 PM',
  '3:00 PM - 3:30 PM', '3:30 PM - 4:00 PM',
  '4:00 PM - 4:30 PM', '4:30 PM - 5:00 PM',
  '5:00 PM - 5:30 PM', '5:30 PM - 6:00 PM'
];

// GET available slots for a date
router.get('/availability/:date', auth, async (req, res) => {
  try {
    const booked = await Booking.find({
      date: req.params.date,
      status: { $ne: 'cancelled' }
    }).select('timeSlot');

    const bookedSlots = booked.map(b => b.timeSlot);
    const availableSlots = ALL_SLOTS.filter(slot => !bookedSlots.includes(slot));

    res.json({ date: req.params.date, availableSlots, bookedSlots });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE booking
router.post('/create', auth, async (req, res) => {
  console.log('Content-Type header:', req.headers['content-type']);
  console.log('RAW req.body:', req.body);
  try {
    const { name, phone, email, date, timeSlot } = req.body;

    const booking = new Booking({
      userId: req.user.id,
      name,
      phone,
      email,
      date,
      timeSlot
    });
    await booking.save();

    try {
      await sendBookingNotificationEmail(booking);
    } catch (emailErr) {
      console.error("Booking email failed:", emailErr.message);
    }

    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This slot was just booked. Please choose another.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET user's own bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;