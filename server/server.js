const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
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
 
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/Products'));
app.use('/api/cart', require('./routes/Cart'));
app.use('/api/orders', require('./routes/Orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/subscriptions', require('./routes/Subscriptions'));
app.get('/', (req, res) => res.send('CNN Farm Hub API running ✅'));
 
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port 5000 ✅`)
    );
  })
  .catch(err => console.error('MongoDB connection error:', err));