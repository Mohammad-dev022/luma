const express = require('express');
const router  = express.Router();

// In-memory user store
let users = [
  { id: 1, name: 'Jane Smith', email: 'jane@example.com', password: 'pass123', joined: '2025-01-15', orders: [] }
];
let nextId = 2;
let sessions = {}; // token -> userId

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'An account with this email already exists' });
  const user = { id: nextId++, name, email, password, joined: new Date().toISOString().split('T')[0], orders: [] };
  users.push(user);
  const token = generateToken();
  sessions[token] = user.id;
  res.status(201).json({ message: 'Account created', token, user: { id: user.id, name: user.name, email: user.email, joined: user.joined } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });
  const token = generateToken();
  sessions[token] = user.id;
  res.json({ message: 'Logged in', token, user: { id: user.id, name: user.name, email: user.email, joined: user.joined } });
});

router.post('/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) delete sessions[token];
  res.json({ message: 'Logged out' });
});

router.get('/me', (req, res) => {
  const token = req.headers['x-auth-token'];
  const userId = sessions[token];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, joined: user.joined });
});

// Add order to user history
router.post('/orders/:orderId', (req, res) => {
  const token = req.headers['x-auth-token'];
  const userId = sessions[token];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.orders.unshift({ orderId: req.params.orderId, ...req.body, date: new Date().toISOString() });
  res.json({ message: 'Order added to history' });
});

router.get('/orders', (req, res) => {
  const token = req.headers['x-auth-token'];
  const userId = sessions[token];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ orders: user.orders });
});

module.exports = router;
module.exports.sessions = sessions;
module.exports.users = users;
