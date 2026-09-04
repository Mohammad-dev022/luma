const express = require('express');
const path    = require('path');
const productRoutes = require('./routes/products');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/orders');
const userRoutes    = require('./routes/users');
const reviewRoutes  = require('./routes/reviews');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/reviews',  reviewRoutes);

// All page routes → serve their own HTML
const pages = ['shop','product','deals','account','orders','cart','search'];
pages.forEach(pg => {
  app.get(`/${pg}`, (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', `${pg}.html`)));
  app.get(`/${pg}/*`, (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', `${pg}.html`)));
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n✦  Luma running at http://localhost:${PORT}\n`));
}
