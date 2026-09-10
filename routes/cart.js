const express = require('express');
const router  = express.Router();
const { products } = require('./products');

let cart = [];

function summary() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity , 0);
  return { itemCount: cart.reduce((s,i) => s+i.quantity, 0), total: parseFloat(total.toFixed(2)), items: cart };
}

router.get('/', (req, res) => res.json(summary()));

router.post('/', (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ error: 'productId and quantity are required' });
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'quantity must be a positive whole number' });
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: `Product with ID ${productId} not found` });
  if (quantity > product.stock) return res.status(400).json({ error: `Only ${product.stock} units of "${product.name}" available in stock` });
  const existing = cart.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId: product.id, name: product.name, price: product.price, emoji: product.emoji, quantity });
  res.status(201).json({ message: `"${product.name}" added to cart`, cart: summary() });
});

router.delete('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) return res.status(400).json({ error: 'productId must be a number' });
  const index = cart.findIndex(i => i.productId === productId);
  if (index === -1) return res.status(404).json({ error: `Product ID ${productId} not found in cart` });
  const removed = cart.splice(index, 1)[0];
  res.json({ message: `"${removed.name}" removed from cart`, cart: summary() });
});

module.exports = router;
module.exports.getCart   = () => cart;
module.exports.clearCart = () => { cart = []; };
