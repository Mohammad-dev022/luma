const request = require('supertest');
const app = require('../app');
const cartModule = require('../routes/cart');
const ordersModule = require('../routes/orders');

beforeEach(() => { cartModule.clearCart(); ordersModule.resetOrders(); });

async function cartAndOrder(productId = 2, quantity = 1) {
  await request(app).post('/api/cart').send({ productId, quantity });
  return request(app).post('/api/orders').send({ customerName: 'Jane Smith', email: 'jane@example.com' });
}

describe('Orders API', () => {
  describe('POST /api/orders', () => {
    test('places order and returns 201', async () => {
      const res = await cartAndOrder();
      expect(res.statusCode).toBe(201);
      expect(res.body.order.status).toBe('confirmed');
    });
    test('order has correct customer details', async () => {
      const res = await cartAndOrder();
      expect(res.body.order.customerName).toBe('Jane Smith');
      expect(res.body.order.email).toBe('jane@example.com');
    });
    test('order contains cart items', async () => {
      const res = await cartAndOrder(3, 2);
      expect(res.body.order.items[0].productId).toBe(3);
      expect(res.body.order.items[0].quantity).toBe(2);
    });
    test('total calculated correctly', async () => {
      const res = await cartAndOrder(4, 3); // £79.99 × 3
      expect(res.body.order.total).toBe(239.97);
    });
    test('cart cleared after order', async () => {
      await cartAndOrder();
      const res = await request(app).get('/api/cart');
      expect(res.body.items.length).toBe(0);
    });
    test('orders get unique incremental IDs', async () => {
      const r1 = await cartAndOrder(1, 1);
      await request(app).post('/api/cart').send({ productId: 2, quantity: 1 });
      const r2 = await request(app).post('/api/orders').send({ customerName: 'Bob', email: 'bob@test.com' });
      expect(r1.body.order.id).toBe(1);
      expect(r2.body.order.id).toBe(2);
    });
    test('returns 400 when cart empty', async () => {
      const res = await request(app).post('/api/orders').send({ customerName: 'Jane', email: 'jane@example.com' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });
    test('returns 400 when customerName missing', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      const res = await request(app).post('/api/orders').send({ email: 'jane@example.com' });
      expect(res.statusCode).toBe(400);
    });
    test('returns 400 when email missing', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      const res = await request(app).post('/api/orders').send({ customerName: 'Jane' });
      expect(res.statusCode).toBe(400);
    });
    test('returns 400 for invalid email', async () => {
      await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
      const res = await request(app).post('/api/orders').send({ customerName: 'Jane', email: 'bad-email' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });
    test('order has valid timestamp', async () => {
      const res = await cartAndOrder();
      expect(new Date(res.body.order.placedAt).toString()).not.toBe('Invalid Date');
    });
  });
  describe('GET /api/orders/:id', () => {
    test('retrieves order by ID', async () => {
      const placed = await cartAndOrder();
      const res = await request(app).get(`/api/orders/${placed.body.order.id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(placed.body.order.id);
    });
    test('returns 404 for non-existent order', async () => {
      const res = await request(app).get('/api/orders/9999');
      expect(res.statusCode).toBe(404);
    });
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).get('/api/orders/abc');
      expect(res.statusCode).toBe(400);
    });
    test('retrieved order matches what was placed', async () => {
      const placed = await cartAndOrder(5, 1);
      const res = await request(app).get(`/api/orders/${placed.body.order.id}`);
      expect(res.body.customerName).toBe('Jane Smith');
      expect(res.body.items[0].productId).toBe(5);
    });
  });
});
