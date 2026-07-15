import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@agentlab/database';
import { AuthService } from '@agentlab/auth';
import { authenticate } from '../middleware/auth.js';
import type { UserRole } from '@agentlab/shared';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  const body = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }

  const passwordHash = await AuthService.hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const payload = { userId: user.id, email: user.email, role: user.role as UserRole };
  const token = AuthService.generateToken(payload);
  const refreshToken = AuthService.generateRefreshToken(payload);

  // Create default workspace
  await prisma.workspace.create({
    data: {
      name: `${user.name || user.email}'s Workspace`,
      users: {
        create: { userId: user.id, role: 'ADMIN' },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      refreshToken,
    },
  });
});

router.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const validPassword = await AuthService.comparePasswords(body.password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const payload = { userId: user.id, email: user.email, role: user.role as UserRole };
  const token = AuthService.generateToken(payload);
  const refreshToken = AuthService.generateRefreshToken(payload);

  res.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      refreshToken,
    },
  });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const payload = AuthService.verifyToken(refreshToken);
    const newToken = AuthService.generateToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    });

    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// Password reset request
const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', async (req, res) => {
  const body = forgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ success: true, data: { message: 'If an account exists, a reset email was sent' } });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  // Store reset token (using ApiKey table as temporary reset token store)
  await prisma.apiKey.create({
    data: {
      name: `password-reset:${resetToken}`,
      key: resetToken,
      userId: user.id,
      expiresAt: resetTokenExpiry,
    },
  });

  // In production, send email here. For dev, log the token.
  console.log(`Password reset token for ${body.email}: ${resetToken}`);

  res.json({ success: true, data: { message: 'If an account exists, a reset email was sent' } });
});

// Reset password with token
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

router.post('/reset-password', async (req, res) => {
  const body = resetPasswordSchema.parse(req.body);

  const resetEntry = await prisma.apiKey.findFirst({
    where: {
      name: `password-reset:${body.token}`,
      key: body.token,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetEntry) {
    return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
  }

  const passwordHash = await AuthService.hashPassword(body.password);

  await prisma.user.update({
    where: { id: resetEntry.userId },
    data: { passwordHash },
  });

  // Delete the reset token
  await prisma.apiKey.delete({ where: { id: resetEntry.id } });

  res.json({ success: true, data: { message: 'Password reset successful' } });
});

// Change password (authenticated)
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.post('/change-password', authenticate, async (req, res) => {
  const body = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

  const validPassword = await AuthService.comparePasswords(body.currentPassword, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }

  const passwordHash = await AuthService.hashPassword(body.newPassword);

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash },
  });

  res.json({ success: true, data: { message: 'Password changed successfully' } });
});

// API Key management
router.get('/api-keys', authenticate, async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: {
      userId: req.user!.id,
      NOT: { name: { startsWith: 'password-reset:' } },
    },
    select: { id: true, name: true, key: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Mask keys
  const maskedKeys = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 8) + '...' + k.key.slice(-4),
  }));

  res.json({ success: true, data: maskedKeys });
});

router.post('/api-keys', authenticate, async (req, res) => {
  const { name, expiresAt } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }

  const key = crypto.randomBytes(32).toString('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      userId: req.user!.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: { id: true, name: true, key: true, expiresAt: true, createdAt: true },
  });

  res.status(201).json({ success: true, data: apiKey });
});

router.delete('/api-keys/:id', authenticate, async (req, res) => {
  await prisma.apiKey.deleteMany({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    },
  });

  res.json({ success: true, message: 'API key deleted' });
});

export { router as authRoutes };
