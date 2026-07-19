const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/emailService');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotifications');
 
// CREATE order
// ✅ Changed from '/create' to '/' — the frontend calls POST /api/orders
// (no /create suffix). If this router is mounted as
// app.use('/api/orders', ordersRouter) in server.js, this now matches.
// NOTE: double check your server.js mounting path — if it's mounted
// differently, adjust this to match instead of changing the frontend.
router.post('/', auth, async (req, res) => {
  try {
    const { items, totalAmount, deliveryAddress, deliveryInstructions, deliverySlot } = req.body;
 
    const order = new Order({
      userId: req.user.id,
      items,
      totalAmount,
      deliveryAddress,
      deliveryInstructions,
      deliverySlot,
    });
    await order.save();
 
    // ✅ Send order confirmation email
    try {
      const user = await User.findById(req.user.id);
      await sendOrderConfirmationEmail(user.email, user.name, order);
    } catch (emailErr) {
      console.error("Order email failed:", emailErr.message);
    }
 
    // Clear cart after order
    await Cart.findOneAndDelete({ userId: req.user.id });
 
    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation failed:', err);
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
 
    // Send push notification to the customer about their order status
    try {
      const user = await User.findById(order.userId);
      if (user?.pushToken) {
        await sendPushNotification(
          user.pushToken,
          'Order Update',
          `Your order is now ${req.body.status}!`,
          { orderId: order._id.toString() }
        );
      }
    } catch (notifErr) {
      console.error('Order notification failed:', notifErr.message);
    }
 
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// UPDATE payment status for an existing order
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const { paymentId, paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentId, paymentStatus },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
module.exports = router;