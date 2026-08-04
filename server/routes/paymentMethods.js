const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Ensures the given user has a Razorpay Customer ID, creating one on Razorpay
// if they don't. Other routes (e.g. Orders.js, when creating a Razorpay order)
// import this so the same customer_id gets used consistently — that's what
// links any card the person saves during checkout back to their account.
async function ensureRazorpayCustomer(user) {
  if (user.razorpayCustomerId) return user.razorpayCustomerId;

  const customer = await razorpay.customers.create({
    name: user.name,
    email: user.email,
    contact: user.phone || undefined,
    fail_existing: 0, // if Razorpay already has a customer with this email/contact, reuse it instead of erroring
  });

  user.razorpayCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// GET /api/payment-methods — list the logged-in user's saved cards
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const customerId = await ensureRazorpayCustomer(user);
    const tokens = await razorpay.customers.fetchTokens(customerId);

    // Only send back what the Settings page actually needs — never forward
    // Razorpay's raw token object straight to the client.
    const cards = (tokens.items || [])
      .filter(t => t.method === 'card' && t.card)
      .map(t => ({
        tokenId: t.id,
        last4: t.card.last4,
        network: t.card.network,       // e.g. "Visa", "Mastercard"
        type: t.card.type,             // "credit" | "debit"
        issuer: t.card.issuer,
        expiryMonth: t.card.expiry_month,
        expiryYear: t.card.expiry_year,
      }));

    res.json({ customerId, cards });
  } catch (err) {
    console.error('Fetching payment methods failed:', err);
    res.status(500).json({ message: 'Could not load payment methods', error: err.message });
  }
});

// DELETE /api/payment-methods/:tokenId — remove a saved card
router.delete('/:tokenId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.razorpayCustomerId) {
      return res.status(404).json({ message: 'No saved payment methods found' });
    }

    await razorpay.customers.deleteToken(user.razorpayCustomerId, req.params.tokenId);
    res.json({ success: true });
  } catch (err) {
    console.error('Deleting payment method failed:', err);
    res.status(500).json({ message: 'Could not remove card', error: err.message });
  }
});

module.exports = { router, ensureRazorpayCustomer };