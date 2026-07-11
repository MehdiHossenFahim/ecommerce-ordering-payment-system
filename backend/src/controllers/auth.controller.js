const passport = require('passport');
const userService = require('../services/userService');
const UserModel = require('../models/User');

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    const { user, token } = await userService.register({ email, password, name });
    res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    next(err);
  }
}

function login(req, res, next) {
  passport.authenticate('local', { session: false }, async (err, prismaUser, info) => {
    try {
      if (err) return next(err);
      if (!prismaUser) return res.status(401).json({ error: info?.message || 'Invalid credentials' });

      const { user, token } = await userService.login(prismaUser);
      res.json({ user: user.toJSON(), token });
    } catch (e) {
      next(e);
    }
  })(req, res, next);
}

function me(req, res) {
  res.json({ user: new UserModel(req.user).toJSON() });
}

async function myOrders(req, res, next) {
  try {
    const orders = await userService.getUserOrders(req.user.id);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, myOrders };
