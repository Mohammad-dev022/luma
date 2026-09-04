const express = require('express');
const router  = express.Router();
const cartModule = require('./cart');

let orders = [];
let nextId = 1;

router.post('/', (req, res) => {
  const { customerName, email } = req.body;
  if (!customerName || !email) return res.status(400).json({ error: 'customerName and email are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address format' });
  const cart = cartModule.getCart();
  if (cart.length === 0) return res.status(400).json({ error: 'Cannot place an order — your cart is empty' });
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const order = { id: nextId++, customerName, email, items: [...cart], total: parseFloat(total.toFixed(2)), status: 'confirmed', placedAt: new Date().toISOString() };
  orders.push(order);
  cartModule.clearCart();
  res.status(201).json({ message: `Order #${order.id} placed successfully!`, order });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Order ID must be a number' });
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: `Order #${id} not found` });
  res.json(order);
});

module.exports = router;
module.exports.resetOrders = () => { orders = []; nextId = 1; };
