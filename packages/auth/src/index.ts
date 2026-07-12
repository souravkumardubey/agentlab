import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayload, AuthUser, UserRole } from '@agentlab/shared';

function getJWTSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return process.env.JWT_SECRET;
}

function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

function parseExpiresToSeconds(value: string): number | undefined {
  const num = Number(value);
  if (!isNaN(num)) return num;
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 604800;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 604800;
  }
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJWTSecret(), { expiresIn: parseExpiresToSeconds(getJWTExpiresIn()) });
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJWTSecret(), { expiresIn: 30 * 86400 });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, getJWTSecret()) as JwtPayload;
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export function requireRole(user: AuthUser, role: UserRole): void {
  if (user.role !== role && user.role !== ('ADMIN' as UserRole)) {
    throw new Error(`Role ${role} required`);
  }
}

export function requireAdmin(user: AuthUser | null): AuthUser {
  const authUser = requireAuth(user);
  requireRole(authUser, 'ADMIN' as UserRole);
  return authUser;
}
