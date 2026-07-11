const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

const testEmail = `order_test_${Date.now()}@example.com`;
let token;
let productId;

describe('Order API', () => {
  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'Password123', name: 'Order Tester' });
    token = registerRes.body.token;

    const product = await prisma.product.create({
      data: { name: 'Test Widget', sku: `SKU-${Date.now()}`, price: 19.99, stock: 5, status: 'active' },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { productId } });
    await prisma.order.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('creates an order with correct calculated total', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(Number(res.body.order.totalAmount)).toBeCloseTo(39.98);
    expect(res.body.order.status).toBe('pending');
  });

  it('rejects an order exceeding available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 999 }] });

    expect(res.status).toBe(409);
  });

  it('rejects order creation without auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });
});
