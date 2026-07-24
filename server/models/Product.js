const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  stock: { type: Number, default: 0 },
  image: { type: String },
  isActive: { type: Boolean, default: true },

  // Added to match your product card UI:
  unit: { type: String, default: '' },
  badge: { type: String, default: '' },
  badgeColor: { type: String, default: '' },
  stars: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);