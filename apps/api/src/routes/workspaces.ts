import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@agentlab/database';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.get('/', async (req, res) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      users: { some: { userId: req.user!.id } },
    },
    include: { _count: { select: { agents: true, documents: true, workflows: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: workspaces });
});

router.post('/', async (req, res) => {
  const body = createWorkspaceSchema.parse(req.body);

  const workspace = await prisma.workspace.create({
    data: {
      name: body.name,
      description: body.description,
      users: {
        create: { userId: req.user!.id, role: 'ADMIN' },
      },
    },
  });

  res.status(201).json({ success: true, data: workspace });
});

router.get('/:id', async (req, res) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: req.params.id,
      users: { some: { userId: req.user!.id } },
    },
    include: {
      agents: true,
      _count: { select: { documents: true, workflows: true } },
    },
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  res.json({ success: true, data: workspace });
});

router.put('/:id', async (req, res) => {
  const workspace = await prisma.workspace.update({
    where: {
      id: req.params.id,
      users: { some: { userId: req.user!.id, role: 'ADMIN' } },
    },
    data: { name: req.body.name, description: req.body.description },
  });

  res.json({ success: true, data: workspace });
});

router.delete('/:id', async (req, res) => {
  await prisma.workspace.delete({
    where: {
      id: req.params.id,
      users: { some: { userId: req.user!.id, role: 'ADMIN' } },
    },
  });

  res.json({ success: true, message: 'Workspace deleted' });
});

// Get workspace members
router.get('/:id/members', async (req, res) => {
  const members = await prisma.workspaceUser.findMany({
    where: { workspaceId: req.params.id, workspace: { users: { some: { userId: req.user!.id } } } },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });

  res.json({ success: true, data: members });
});

// Add member to workspace (ADMIN only)
const addMemberSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'USER', 'VIEWER']).default('USER') });

router.post('/:id/members', async (req, res) => {
  const body = addMemberSchema.parse(req.body);

  // Check requester is ADMIN
  const membership = await prisma.workspaceUser.findFirst({
    where: { workspaceId: req.params.id, userId: req.user!.id, role: 'ADMIN' },
  });

  if (!membership) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const userToAdd = await prisma.user.findUnique({ where: { email: body.email } });
  if (!userToAdd) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const existing = await prisma.workspaceUser.findFirst({
    where: { workspaceId: req.params.id, userId: userToAdd.id },
  });

  if (existing) {
    return res.status(409).json({ success: false, error: 'User already in workspace' });
  }

  const member = await prisma.workspaceUser.create({
    data: { workspaceId: req.params.id, userId: userToAdd.id, role: body.role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  res.status(201).json({ success: true, data: member });
});

// Remove member from workspace (ADMIN only)
router.delete('/:id/members/:memberId', async (req, res) => {
  const membership = await prisma.workspaceUser.findFirst({
    where: { workspaceId: req.params.id, userId: req.user!.id, role: 'ADMIN' },
  });

  if (!membership) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  // Verify the target member belongs to this workspace
  const targetMember = await prisma.workspaceUser.findFirst({
    where: { id: req.params.memberId, workspaceId: req.params.id },
  });

  if (!targetMember) {
    return res.status(404).json({ success: false, error: 'Member not found in this workspace' });
  }

  // Prevent removing the last admin
  if (targetMember.role === 'ADMIN') {
    const adminCount = await prisma.workspaceUser.count({
      where: { workspaceId: req.params.id, role: 'ADMIN' },
    });

    if (adminCount <= 1) {
      return res.status(400).json({ success: false, error: 'Cannot remove the last admin' });
    }
  }

  await prisma.workspaceUser.delete({
    where: { id: req.params.memberId },
  });

  res.json({ success: true, message: 'Member removed' });
});

export { router as workspaceRoutes };
