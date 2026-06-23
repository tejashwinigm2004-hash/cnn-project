const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendPushNotification, sendPushNotificationToMany } = require('../utils/pushNotifications');

// ✅ GET ALL ORDERS
router.get('/orders', adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'name email phone');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ UPDATE ORDER STATUS
router.patch('/orders/:id', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    try {
      const user = await User.findById(order.userId);
      if (user?.pushToken) {
        await sendPushNotification(
          user.pushToken,
          'Order Update',
          `Your order is now ${status}!`,
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

// ✅ GET ALL USERS
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ ADD PRODUCT
router.post('/products', adminMiddleware, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ EDIT PRODUCT
router.patch('/products/:id', adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ DELETE PRODUCT
router.delete('/products/:id', adminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ SALES ANALYTICS
router.get('/analytics', adminMiddleware, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// ✅ SEND ANNOUNCEMENT TO ALL USERS
router.post('/announce', adminMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;
    const users = await User.find({ pushToken: { $exists: true, $ne: null } });
    const tokens = users.map(u => u.pushToken);
    const result = await sendPushNotificationToMany(tokens, title, message);
    res.json({ message: `Announcement sent to ${tokens.length} users`, result });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;