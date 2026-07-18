const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Distinguishes the two subscription types
  type: {
    type: String,
    enum: ['product', 'plan'],
    required: true,
    default: 'product'
  },

  // --- Fields for per-product subscriptions (type: 'product') ---
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly']
  },
  quantity: {
    type: Number,
    default: 1
  },

  // --- Fields for tiered bundle plans (type: 'plan') ---
  planId: {
    type: String // 'starter' | 'premium' | 'family'
  },
  planName: {
    type: String
  },
  price: {
    type: Number
  },
  features: [{
    type: String
  }],
  paymentId: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  nextBillingDate: {
    type: Date
  },

  // --- Shared fields ---
  deliveryAddress: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  nextDelivery: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);