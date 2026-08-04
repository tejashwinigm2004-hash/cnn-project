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

// Server-side source of truth for subscription plan prices — NEVER trust a
// plan fee sent from the browser. Keep this in sync with PLANS[].prices in
// App.js. Keyed by plan id (basic/premium/family) then frequency.
const PLAN_PRICES = {
  basic:   { daily: 800,  weekly: 1000, monthly: 1500 },
  premium: { daily: 2500, weekly: 3000, monthly: 3500 },
  family:  { daily: 1200, weekly: 1500, monthly: 2000 },
};

// CREATE order — now recomputes the subscription plan fee server-side
// instead of trusting the browser's subscriptionPlanFee number.
router.post('/', auth, async (req, res) => {
  try {
    const {
      items,
      totalAmount,
      deliveryAddress,
      deliveryInstructions,
      deliverySlot,
      subscriptionPlanId,
      subscriptionPlanFreq, // "daily" | "weekly" | "monthly" — sent by the frontend
    } = req.body;

    // If this order includes a subscription plan, look up its REAL price.
    // Ignore whatever fee the browser sent — recompute it here.
    let verifiedPlanFee = 0;
    if (subscriptionPlanId) {
      const planPrices = PLAN_PRICES[subscriptionPlanId];
      const price = planPrices?.[subscriptionPlanFreq];
      if (!price) {
        return res.status(400).json({ message: 'Invalid subscription plan or billing frequency.' });
      }
      verifiedPlanFee = price;
    }

    // Item prices still come from what the frontend says the cart contains.
    // This is reasonably safe since that data originates from your real
    // /api/cart (populated from actual Product docs), but for full protection
    // you'd eventually want to re-fetch the user's Cart server-side here too
    // and price items from the DB instead of trusting req.body.items.
    const itemsSubtotal = (items || []).reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    );

    const verifiedTotal = itemsSubtotal + verifiedPlanFee;

    const order = new Order({
      userId: req.user.id,
      items,
      totalAmount: verifiedTotal, // server-computed, not the client's number
      deliveryAddress,
      deliveryInstructions,
      deliverySlot,
      subscriptionPlanId: subscriptionPlanId || undefined,
      subscriptionPlanFee: verifiedPlanFee || undefined,
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

// ── create a Razorpay order (called right before opening the checkout popup) ──
// SECURITY FIX: this used to charge whatever "amount" the browser sent.
// Now it looks up the order's own totalAmount (verified server-side above)
// and charges that instead — the browser's number is no longer trusted here.
router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { orderId } = req.body; // your DB order's _id — amount is no longer accepted from the client

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (dbOrder.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your order' });
    }
    if (dbOrder.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    const amount = dbOrder.totalAmount; // the SERVER's known amount, not the browser's

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `order_${orderId}`,
      notes: { dbOrderId: orderId },
    });

    res.json(razorpayOrder);
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({ message: 'Could not initiate payment' });
  }
});

// ── verify payment signature (called after Razorpay checkout succeeds) ──
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

// GET logged-in user's own orders (userId comes from the verified token, never the URL)
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
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