import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRepo } from '../repositories/user.repo';

const SALT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function safePlainTextCompare(plain: string, stored: string): boolean {
  const plainBuffer = Buffer.from(plain);
  const storedBuffer = Buffer.from(stored);

  if (plainBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(plainBuffer, storedBuffer);
}

export const AuthService = {
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  },

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    if (!hashed) return false;

    if (BCRYPT_HASH_PATTERN.test(hashed)) {
      return bcrypt.compare(plain, hashed);
    }

    return safePlainTextCompare(plain, hashed);
  },

  needsPasswordRehash(storedPassword: string): boolean {
    return !BCRYPT_HASH_PATTERN.test(storedPassword);
  },

  /**
   * Find user by email OR username.
   * Determines type automatically — if identifier contains '@' it's email, else username.
   */
  async findUserByIdentifier(identifier: string) {
    return UserRepo.findByEmailOrUsername(identifier.trim());
  },

  /** Strips the password field before sending to client */
  sanitize(user: Record<string, any>) {
    const { password: _, ...safe } = user;
    return safe;
  },
};
