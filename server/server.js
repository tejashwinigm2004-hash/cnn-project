const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/Products', require('./routes/Products'));
app.use('/api/Cart', require('./routes/cart'));
app.use('/api/Orders', require('./routes/orders'));

app.get('/', (req, res) => res.send('CNN Farm Hub API running ✅'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port 5000 ✅`)
    );
  })
  .catch(err => console.error('MongoDB connection error:', err));