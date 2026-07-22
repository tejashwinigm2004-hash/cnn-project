const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

module.exports = router;