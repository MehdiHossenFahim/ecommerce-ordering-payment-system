const prisma = require('../config/prisma');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

async function register({ email, password, name }) {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await User.hashPassword(password);

  const created = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name, role: 'USER' },
  });

  const user = new User(created);
  return { user, token: user.issueJwt() };
}

async function login(prismaUser) {
  const user = new User(prismaUser);
  return { user, token: user.issueJwt() };
}

async function getUserOrders(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } }, payments: true },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { register, login, getUserOrders };
