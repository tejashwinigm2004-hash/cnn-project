const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay'); // npm install razorpay
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/emailService');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotifications');
 
// Initialize Razorpay with your keys (set these in your .env file)
// RAZORPAY_KEY_ID=rzp_test_xxxxxxxx  (or rzp_live_xxxxxxxx for production)
// RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
 
// CREATE order (unchanged - creates the order in your DB as "pending")
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
      paymentStatus: 'pending', // make sure your Order model supports this field
    });
    await order.save();
 
    await Cart.findOneAndDelete({ userId: req.user.id });
 
    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// ── NEW: create a Razorpay order (called right before opening the checkout popup) ──
router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { amount, orderId } = req.body; // amount in rupees, orderId = your DB order's _id
 
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
 
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: orderId ? `order_${orderId}` : `receipt_${Date.now()}`,
      notes: { dbOrderId: orderId || '' },
    });
 
    res.json(razorpayOrder);
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({ message: 'Could not initiate payment' });
  }
});
 
// ── NEW: verify payment signature (called after Razorpay checkout succeeds) ──
// This is the step that actually confirms money was received - never trust
// the frontend's word for it, always recompute the signature server-side.
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
 
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }
 
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
 
    const isAuthentic = expectedSignature === razorpay_signature;
 
    if (!isAuthentic) {
      // Signature mismatch = tampered request or fake payment attempt
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
 
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentId: razorpay_payment_id,
        paymentStatus: 'paid',
        razorpayOrderId: razorpay_order_id,
      },
      { new: true }
    );
 
    try {
      const user = await User.findById(order.userId);
      await sendOrderConfirmationEmail(user.email, user.name, order);
      if (user?.pushToken) {
        await sendPushNotification(
          user.pushToken,
          'Payment Received',
          `Your order has been paid and confirmed!`,
          { orderId: order._id.toString() }
        );
      }
    } catch (notifErr) {
      console.error('Post-payment notification failed:', notifErr.message);
    }
 
    res.json({ success: true, order });
  } catch (err) {
    console.error('Payment verification error:', err);
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
 
// UPDATE order status (delivery status - unrelated to payment)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
 
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
 
// REMOVED: the old `/:id/payment` route that let the client set paymentStatus
// directly is gone - `/verify-payment` above replaces it safely. If anything
// else in your app still calls PATCH /:id/payment, point it at the new flow.
 
module.exports = router;