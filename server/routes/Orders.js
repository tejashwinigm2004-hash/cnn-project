const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// CREATE order
router.post('/create', auth, async (req, res) => {
  try {
    const { items, totalAmount, deliveryAddress } = req.body;
    const order = new Order({
      userId: req.user.id,
      items,
      totalAmount,
      deliveryAddress
    });
    await order.save();

    // Clear cart after order
    await Cart.findOneAndDelete({ userId: req.user.id });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET user orders
router.get('/:userId', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE order status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;