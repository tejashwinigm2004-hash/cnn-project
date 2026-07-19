const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    image: { type: String },
    quantity: { type: Number },
    price: { type: Number }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'delivered', 'cancelled'] },
  paymentId: { type: String },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed'] },
  deliveryAddress: {
    name: { type: String },
    phone: { type: String },
    altPhone: { type: String },
    houseNo: { type: String },
    street: { type: String },
    landmark: { type: String },
    city: { type: String },
    pincode: { type: String },
  },
  deliveryInstructions: { type: String },
  deliverySlot: { type: String },
  deliveryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);