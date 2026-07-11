const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User domain class - wraps a Prisma user record with behavior.
 * Keeps password hashing / token issuance / serialization logic in one place
 * so it can be reused and extended independently of the persistence layer.
 */
class User {
  constructor(prismaUser) {
    this.id = prismaUser.id;
    this.email = prismaUser.email;
    this.name = prismaUser.name;
    this.role = prismaUser.role;
    this.passwordHash = prismaUser.passwordHash;
    this.createdAt = prismaUser.createdAt;
  }

  static async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
  }

  async verifyPassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  issueJwt() {
    return jwt.sign({ sub: this.id, role: this.role, email: this.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  // Never leak passwordHash to API responses
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
