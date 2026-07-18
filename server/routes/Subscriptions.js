const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');

// ✅ CREATE subscription (handles BOTH product subscriptions and tiered plans)
router.post('/create', auth, async (req, res) => {
  try {
    const {
      productId, frequency, quantity, deliveryAddress, // product-type fields
      planId, planName, price, features, paymentId, paymentStatus, // plan-type fields
    } = req.body;

    // If planId is present, this is a tiered plan subscription
    if (planId) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const subscription = new Subscription({
        userId: req.user.id,
        type: 'plan',
        planId,
        planName,
        price,
        features,
        paymentId,
        paymentStatus,
        nextBillingDate,
      });

      await subscription.save();
      return res.status(201).json(subscription);
    }

    // Otherwise, this is a per-product subscription (original behavior)
    const nextDelivery = new Date();
    if (frequency === 'daily') nextDelivery.setDate(nextDelivery.getDate() + 1);
    if (frequency === 'weekly') nextDelivery.setDate(nextDelivery.getDate() + 7);
    if (frequency === 'monthly') nextDelivery.setMonth(nextDelivery.getMonth() + 1);

    const subscription = new Subscription({
      userId: req.user.id,
      type: 'product',
      productId,
      frequency,
      quantity,
      deliveryAddress,
      nextDelivery
    });

    await subscription.save();
    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ GET user subscriptions (returns ALL — both product and plan types)
router.get('/:userId', auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.params.userId })
      .populate('productId', 'name price image')
      .sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ PAUSE subscription
router.patch('/:id/pause', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'paused' },
      { new: true }
    );
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ RESUME subscription
router.patch('/:id/resume', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ CANCEL subscription
router.delete('/:id/cancel', auth, async (req, res) => {
  try {
    await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;