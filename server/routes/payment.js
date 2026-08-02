const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Server-side prices in RUPEES — never trust an amount sent from the browser.
// This is what stops someone from tampering with the request and paying ₹1
// instead of the real price. Keep this in sync with the plans/prices shown
// in App.js (SUBSCRIPTION_PLANS + the Farm Visit page).
const PLAN_PRICES = {
  basic: 1400,       // Starter subscription
  premium: 3200,     // Premium subscription
  family: 5600,      // Family subscription
  farm_visit: 200,   // Flat fee per farm visit booking
};

// Create order
router.post("/order", async (req, res) => {
  const { amount, currency = "INR" } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency,
      receipt: `receipt_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify payment
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // TODO: mark order as paid in MongoDB here
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

// ── Routes the frontend (SubPage + FarmVisitBookingPage) actually calls ──
// These look up the price server-side by planId instead of trusting a
// client-sent amount, so the price can't be tampered with in the browser.

// Create order — driven by planId, not by a client-supplied amount
router.post("/create-order", async (req, res) => {
  const { planId, currency = "INR" } = req.body;
  const priceInRupees = PLAN_PRICES[planId];

  if (!priceInRupees) {
    return res.status(400).json({ message: "Unknown or missing planId." });
  }

  try {
    const order = await razorpay.orders.create({
      amount: priceInRupees * 100, // paise
      currency,
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: { planId, ...req.body }, // keeps visitDate/visitors/name/contact etc. attached to the order
    });
    res.json(order);
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Verify payment — same signature check as /verify, kept as a separate
// route so the frontend's existing calls to /verify-payment keep working
router.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // TODO: mark the subscription/farm-visit booking as paid in MongoDB here.
    // req.body also includes planId, name, contact, visitDate, visitors
    // (for farm_visit bookings) or planId (for subscriptions) — save
    // whichever fields are present alongside the payment record.
    res.json({ verified: true, success: true });
  } else {
    res.status(400).json({ verified: false, success: false });
  }
});

module.exports = router;