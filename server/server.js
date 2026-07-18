const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',                              // local website dev
  'https://tejashwinigm2004-hash.github.io'              // deployed website (GitHub Pages)
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 minutes
  message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login/signup attempts per 15 minutes
  message: { message: 'Too many attempts, please try again after 15 minutes.' }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use(express.json());

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/Products'));
app.use('/api/cart', require('./routes/Cart'));
app.use('/api/orders', require('./routes/Orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/subscriptions', require('./routes/Subscriptions'));
app.use('/api/bookings', require('./routes/bookings'));

// Razorpay: create order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
});

// Razorpay: verify payment signature
app.post('/api/payment/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, message: 'Missing payment details' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // TODO: mark the corresponding order as paid in your Orders collection here
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false, message: 'Signature mismatch' });
    }
  } catch (err) {
    console.error('Razorpay verify-payment error:', err);
    res.status(500).json({ verified: false, error: err.message });
  }
});

app.get('/', (req, res) => res.send('CNN Farm Hub API running ✅'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port 5000 ✅`)
    );
  })
  .catch(err => console.error('MongoDB connection error:', err));