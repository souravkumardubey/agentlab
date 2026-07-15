import { Router } from 'express';
import { prisma } from '@agentlab/database';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// NOTE: /search must be defined BEFORE /:id to avoid route shadowing
router.get('/search', async (req, res) => {
  const { q, agentId } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ success: false, error: 'Search query required' });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      agentId: agentId as string | undefined,
      agent: { workspace: { users: { some: { userId: req.user!.id } } } },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { messages: { some: { content: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: {
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
      agent: { select: { name: true, type: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: conversations });
});

router.get('/', async (req, res) => {
  const { agentId } = req.query;

  const conversations = await prisma.conversation.findMany({
    where: {
      agentId: agentId as string,
      agent: { workspace: { users: { some: { userId: req.user!.id } } } },
    },
    include: {
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
      agent: { select: { name: true, type: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, data: conversations });
});

router.get('/:id', async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: req.params.id,
      agent: { workspace: { users: { some: { userId: req.user!.id } } } },
    },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      agent: { select: { name: true, type: true, model: true } },
    },
  });

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  res.json({ success: true, data: conversation });
});

router.delete('/:id', async (req, res) => {
  await prisma.conversation.delete({
    where: {
      id: req.params.id,
      agent: { workspace: { users: { some: { userId: req.user!.id } } } },
    },
  });

  res.json({ success: true, message: 'Conversation deleted' });
});

router.put('/:id', async (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ success: false, error: 'Title required' });
  }

  const conversation = await prisma.conversation.update({
    where: {
      id: req.params.id,
      agent: { workspace: { users: { some: { userId: req.user!.id } } } },
    },
    data: { title },
  });

  res.json({ success: true, data: conversation });
});

export { router as conversationRoutes };
