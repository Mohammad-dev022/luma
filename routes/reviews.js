const express = require('express');
const router  = express.Router();
const { sessions, users } = require('./users');

let reviews = [
  { id: 1, productId: 1, userId: 1, userName: 'Jane S.', rating: 5, title: 'Absolutely love it', body: 'This exceeded every expectation. The display is stunning and the battery life is incredible. Best purchase I\'ve made this year.', date: '2025-11-20', helpful: 12, verified: true },
  { id: 2, productId: 1, userId: 0, userName: 'Tom R.', rating: 4, title: 'Great machine, pricey', body: 'Performance is genuinely impressive for creative work. Only reason it\'s not 5 stars is the price tag — but you do get what you pay for.', date: '2025-12-01', helpful: 8, verified: true },
  { id: 3, productId: 2, userId: 0, userName: 'Priya K.', rating: 5, title: 'Game changing for commuting', body: 'I was sceptical at this price but after a week I understood why people swear by these. The noise cancellation is genuinely remarkable.', date: '2026-01-05', helpful: 15, verified: true },
  { id: 4, productId: 3, userId: 0, userName: 'Marcus D.', rating: 4, title: 'Comfortable all day', body: 'Wear these for long walks without any discomfort. True to size, good cushioning. Only slight gripe is they pick up mud easily.', date: '2026-02-10', helpful: 6, verified: false },
];
let nextId = 5;

router.get('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) return res.status(400).json({ error: 'Product ID must be a number' });
  const productReviews = reviews.filter(r => r.productId === productId);
  const avg = productReviews.length ? (productReviews.reduce((s,r) => s + r.rating, 0) / productReviews.length).toFixed(1) : null;
  res.json({ productId, count: productReviews.length, average: avg ? parseFloat(avg) : null, reviews: productReviews });
});

router.post('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) return res.status(400).json({ error: 'Product ID must be a number' });
  const { rating, title, body } = req.body;
  if (!rating || !title || !body) return res.status(400).json({ error: 'rating, title and body are required' });
  if (typeof rating !== 'number' || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
  // Get user name if logged in
  const token = req.headers['x-auth-token'];
  const userId = sessions[token];
  const user = userId ? users.find(u => u.id === userId) : null;
  const review = {
    id: nextId++, productId, userId: userId || 0,
    userName: user ? user.name.split(' ')[0] + ' ' + user.name.split(' ').slice(-1)[0][0] + '.' : 'Anonymous',
    rating, title, body, date: new Date().toISOString().split('T')[0], helpful: 0, verified: !!user
  };
  reviews.push(review);
  res.status(201).json({ message: 'Review submitted', review });
});

router.post('/:reviewId/helpful', (req, res) => {
  const reviewId = parseInt(req.params.reviewId);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.helpful++;
  res.json({ helpful: review.helpful });
});

module.exports = router;
