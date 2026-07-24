const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');
 
// GET cart
router.get('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    res.json(cart || { items: [] });
  } catch (err) {
    console.error('GET /api/cart failed:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// ADD to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log('Add to cart request:', { userId: req.user.id, productId, quantity });
 
    let cart = await Cart.findOne({ userId: req.user.id });
 
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    }
 
    const itemIndex = cart.items.findIndex(i => i.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
 
    await cart.save();
    const populated = await cart.populate('items.productId');
    res.json(populated);
  } catch (err) {
    console.error('POST /api/cart/add failed:', err); // <-- this will now print the real error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// set exact quantity
router.patch('/update', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
 
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId.toString() !== productId);
    } else {
      const itemIndex = cart.items.findIndex(i => i.productId.toString() === productId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
    }
 
    await cart.save();
    const populated = await cart.populate('items.productId');
    res.json(populated);
  } catch (err) {
    console.error('PATCH /api/cart/update failed:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
// REMOVE from cart
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
 
    cart.items = cart.items.filter(i => i.productId.toString() !== req.params.productId);
    await cart.save();
    const populated = await cart.populate('items.productId');
    res.json(populated);
  } catch (err) {
    console.error('DELETE /api/cart/remove failed:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
 
module.exports = router;
 