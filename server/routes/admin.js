const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Booking = require('../models/Booking');
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
 
// ✅ GET ALL BOOKINGS
router.get('/bookings', adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('userId', 'name email phone').sort({ date: 1, timeSlot: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// ✅ UPDATE BOOKING STATUS
router.patch('/bookings/:id', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
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
    const totalBookings = await Booking.countDocuments();
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
 
    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalBookings,
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