import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@agentlab/shared';
import { logger } from '../index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ err, statusCode: err.statusCode }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  if (err.name === 'ValidationError') {
    logger.warn({ err }, 'Validation error');
    return res.status(400).json({ success: false, error: err.message });
  }

  if (err.message === 'Authentication required') {
    logger.warn({ err }, 'Authentication required');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (err.message.includes('Role') && err.message.includes('required')) {
    logger.warn({ err }, 'Forbidden');
    return res.status(403).json({ success: false, error: err.message });
  }

  if (err.message.includes('Not found') || err.message.includes('not found')) {
    logger.warn({ err }, 'Not found');
    return res.status(404).json({ success: false, error: err.message });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ success: false, error: 'Internal server error' });
}
