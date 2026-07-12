import { describe, it, expect } from 'vitest';
import { AuthService } from './index.js';

describe('Auth Package', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hashed = await AuthService.hashPassword(password);
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testpassword123';
      const hashed = await AuthService.hashPassword(password);
      const result = await AuthService.comparePasswords(password, hashed);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testpassword123';
      const hashed = await AuthService.hashPassword(password);
      const result = await AuthService.comparePasswords('wrongpassword', hashed);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      process.env.JWT_SECRET = 'test-secret';
      const payload = { userId: 'user-1', email: 'test@example.com', role: 'USER' as const };
      const token = AuthService.generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      process.env.JWT_SECRET = 'test-secret';
      const payload = { userId: 'user-1', email: 'test@example.com', role: 'USER' as const };
      const token = AuthService.generateToken(payload);
      const verified = AuthService.verifyToken(token);
      expect(verified).toBeDefined();
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
    });

    it('should throw for invalid token', () => {
      process.env.JWT_SECRET = 'test-secret';
      expect(() => AuthService.verifyToken('invalid-token')).toThrow();
    });
  });
});
