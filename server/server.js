const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();
 
const app = express();
app.set('trust proxy', 1); // Required so express-rate-limit reads the real client IP behind Render's proxy
 
const allowedOrigins = [
  'https://tejashwinigm2004-hash.github.io',
  'https://cnnfarmhub.shop',
  'http://cnnfarmhub.shop',
  'https://www.cnnfarmhub.shop',
  'http://www.cnnfarmhub.shop'
];
 
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use(express.json({ limit: '5mb' }));
 
// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
 
// Server-side source of truth for plan prices — NEVER trust price/amount sent from the client.
// Keep this in sync with the PLANS array in SubscriptionsScreen.js.
const PLAN_PRICES = {
  starter: 1400,
  premium: 3200,
  family: 5600,
};
 
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/Products'));
app.use('/api/cart', require('./routes/Cart'));
app.use('/api/orders', require('./routes/Orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/subscriptions', require('./routes/Subscriptions'));
app.use('/api/bookings', require('./routes/bookings'));
 
// Razorpay: create order
// Supports two payment types:
//  - { planId } for subscription plans — price looked up from PLAN_PRICES
//  - { orderId } for existing cart orders — price looked up from the saved Order doc
// The client never gets to dictate the amount directly.
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { planId, orderId } = req.body;
    let price;
    let notes = {};
 
    if (planId) {
      price = PLAN_PRICES[planId];
      if (!price) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      notes = { type: 'plan', planId };
    } else if (orderId) {
      const Order = require('./models/Order');
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: 'Order already paid' });
      }
      price = order.totalAmount;
      notes = { type: 'order', orderId };
    } else {
      return res.status(400).json({ message: 'planId or orderId is required' });
    }
 
    const order = await razorpay.orders.create({
      amount: Math.round(price * 100), // convert to paise, using the SERVER's known price
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes,
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