const request = require('supertest');
const app = require('../app');
const cartModule = require('../routes/cart');

beforeEach(() => cartModule.clearCart());

describe('Cart API', () => {
  describe('GET /api/cart', () => {
    test('returns empty cart initially', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.statusCode).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });
    test('reflects correct total after adding', async () => {
      await request(app).post('/api/cart').send({ productId: 4, quantity: 2 });
      const res = await request(app).get('/api/cart');
      expect(res.body.total).toBe(159.98);
      expect(res.body.itemCount).toBe(2);
    });
  });
  describe('POST /api/cart', () => {
    test('adds product and returns 201', async () => {
      const res = await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toMatch(/MacBook Pro/i);
    });
    test('increases quantity for duplicate', async () => {
      await request(app).post('/api/cart').send({ productId: 2, quantity: 1 });
      await request(app).post('/api/cart').send({ productId: 2, quantity: 2 });
      const res = await request(app).get('/api/cart');
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].quantity).toBe(3);
    });
    test('returns 400 if productId missing', async () => {
      const res = await request(app).post('/api/cart').send({ quantity: 1 });
      expect(res.statusCode).toBe(400);
    });
    test('returns 400 if quantity missing', async () => {
      const res = await request(app).post('/api/cart').send({ productId: 1 });
      expect(res.statusCode).toBe(400);
    });
    test('returns 400 if quantity less than 1', async () => {
      const res = await request(app).post('/api/cart').send({ productId: 1, quantity: 0 });
      expect(res.statusCode).toBe(400);
    });
    test('returns 404 for unknown product', async () => {
      const res = await request(app).post('/api/cart').send({ productId: 9999, quantity: 1 });
      expect(res.statusCode).toBe(404);
    });
    test('returns 400 when quantity exceeds stock', async () => {
      const res = await request(app).post('/api/cart').send({ productId: 1, quantity: 500 });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/stock/i);
    });
    test('can add multiple different products', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      await request(app).post('/api/cart').send({ productId: 3, quantity: 2 });
      const res = await request(app).get('/api/cart');
      expect(res.body.items.length).toBe(2);
    });
  });
  describe('DELETE /api/cart/:productId', () => {
    test('removes item successfully', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      const res = await request(app).delete('/api/cart/1');
      expect(res.statusCode).toBe(200);
      expect(res.body.cart.items.length).toBe(0);
    });
    test('returns 404 for item not in cart', async () => {
      const res = await request(app).delete('/api/cart/999');
      expect(res.statusCode).toBe(404);
    });
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).delete('/api/cart/abc');
      expect(res.statusCode).toBe(400);
    });
    test('total updates after removal', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      await request(app).post('/api/cart').send({ productId: 4, quantity: 1 });
      await request(app).delete('/api/cart/1');
      const res = await request(app).get('/api/cart');
      expect(res.body.total).toBe(79.99);
    });
  });
});
