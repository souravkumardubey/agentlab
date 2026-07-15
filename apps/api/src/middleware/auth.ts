import type { Request, Response, NextFunction } from 'express';
import { AuthService, requireAuth, requireRole } from '@agentlab/auth';
import { prisma } from '@agentlab/database';
import type { UserRole } from '@agentlab/shared';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new Error('Authentication required'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = AuthService.verifyToken(token);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as UserRole,
    };

    next();
  } catch {
    next(new Error('Authentication required'));
  }
}

export function requireRoleMiddleware(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new Error('Authentication required'));
    }
    requireRole(req.user, role);
    next();
  };
}
