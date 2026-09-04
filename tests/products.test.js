const request = require('supertest');
const app = require('../app');

describe('Products API', () => {
  describe('GET /api/products', () => {
    test('returns 200 and products array', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
    });
    test('count matches array length', async () => {
      const res = await request(app).get('/api/products');
      expect(res.body.count).toBe(res.body.products.length);
    });
    test('products have required fields', async () => {
      const res = await request(app).get('/api/products');
      res.body.products.forEach(p => {
        ['id','name','category','price','stock','emoji','rating','reviews','description'].forEach(f => expect(p).toHaveProperty(f));
      });
    });
    test('filters by category', async () => {
      const res = await request(app).get('/api/products?category=Electronics');
      expect(res.statusCode).toBe(200);
      res.body.products.forEach(p => expect(p.category).toBe('Electronics'));
    });
    test('returns empty for unknown category', async () => {
      const res = await request(app).get('/api/products?category=Unknown');
      expect(res.body.products.length).toBe(0);
    });
    test('filters by search', async () => {
      const res = await request(app).get('/api/products?search=Nike');
      expect(res.body.products.length).toBeGreaterThan(0);
    });
    test('sorts price ascending', async () => {
      const res = await request(app).get('/api/products?sort=price-asc');
      const prices = res.body.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a,b) => a - b));
    });
    test('sorts price descending', async () => {
      const res = await request(app).get('/api/products?sort=price-desc');
      const prices = res.body.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a,b) => b - a));
    });
  });
  describe('GET /api/products/deals', () => {
    test('returns only discounted products', async () => {
      const res = await request(app).get('/api/products/deals');
      expect(res.statusCode).toBe(200);
      res.body.products.forEach(p => {
        expect(p.originalPrice).not.toBeNull();
        expect(p.originalPrice).toBeGreaterThan(p.price);
      });
    });
  });
  describe('GET /api/products/:id', () => {
    test('returns correct product for valid ID', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('MacBook Pro 16"');
    });
    test('includes relatedProducts', async () => {
      const res = await request(app).get('/api/products/1');
      expect(Array.isArray(res.body.relatedProducts)).toBe(true);
    });
    test('returns 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/products/9999');
      expect(res.statusCode).toBe(404);
    });
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).get('/api/products/abc');
      expect(res.statusCode).toBe(400);
    });
    test('returns correct products for IDs 1-5', async () => {
      for (const id of [1,2,3,4,5]) {
        const res = await request(app).get(`/api/products/${id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(id);
      }
    });
  });
});
