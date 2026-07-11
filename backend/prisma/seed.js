require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'Store Admin',
      role: 'ADMIN',
    },
  });
  console.log('Seeded admin user:', admin.email, '(password: Admin@12345)');

  const electronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const phones = await prisma.category.create({ data: { name: 'Phones', parentId: electronics.id } });
  const laptops = await prisma.category.create({ data: { name: 'Laptops', parentId: electronics.id } });

  const products = [
    { name: 'Aurora Smartphone X1', sku: 'PHN-001', price: 599.99, stock: 50, categoryId: phones.id, description: 'Flagship smartphone with 6.5" OLED display.' },
    { name: 'Aurora Smartphone Lite', sku: 'PHN-002', price: 299.99, stock: 80, categoryId: phones.id, description: 'Budget-friendly smartphone.' },
    { name: 'Nimbus Laptop Pro 14', sku: 'LAP-001', price: 1299.0, stock: 25, categoryId: laptops.id, description: '14-inch laptop, 16GB RAM, 512GB SSD.' },
    { name: 'Nimbus Laptop Air 13', sku: 'LAP-002', price: 999.0, stock: 30, categoryId: laptops.id, description: 'Lightweight 13-inch laptop.' },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }
  console.log(`Seeded ${products.length} products across ${3} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
