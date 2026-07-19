import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@agentlab/database';
import { authenticate } from '../middleware/auth.js';
import { runAgent } from '@agentlab/agents';

const router = Router();

router.use(authenticate);

const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['CHAT', 'RAG', 'ROUTER', 'WORKFLOW', 'CUSTOM']).default('CHAT'),
  model: z.string().default('gpt-4o-mini'),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  workspaceId: z.string(),
});

router.get('/', async (req, res) => {
  const { workspaceId } = req.query;

  const agents = await prisma.agent.findMany({
    where: {
      workspaceId: workspaceId as string,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    include: { _count: { select: { conversations: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: agents });
});

router.post('/', async (req, res) => {
  const body = createAgentSchema.parse(req.body);

  // Verify workspace access
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: body.workspaceId,
      users: { some: { userId: req.user!.id } },
    },
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  const agent = await prisma.agent.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      model: body.model,
      systemPrompt: body.systemPrompt,
      config: {
        ...(body.config ?? {}),
        tools: body.tools || [],
      } as never,
      workspaceId: body.workspaceId,
    },
  });

  res.status(201).json({ success: true, data: agent });
});

router.get('/:id', async (req, res) => {
  const agent = await prisma.agent.findFirst({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    include: { _count: { select: { conversations: true } } },
  });

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  res.json({ success: true, data: agent });
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.agent.findFirst({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      model: req.body.model,
      systemPrompt: req.body.systemPrompt,
      config: {
        ...(existing.config as Record<string, unknown> || {}),
        ...(req.body.config || {}),
        ...(req.body.tools !== undefined ? { tools: req.body.tools } : {}),
      },
    },
  });

  res.json({ success: true, data: agent });
});

router.delete('/:id', async (req, res) => {
  await prisma.agent.delete({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
  });

  res.json({ success: true, message: 'Agent deleted' });
});

router.post('/:id/chat', async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message required' });
  }

  // Create or get conversation
  const conversation = conversationId
    ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
    : await prisma.conversation.create({
        data: {
          agentId: req.params.id,
          title: message.slice(0, 100),
        },
      });

  // Save user message
  await prisma.message.create({
    data: {
      role: 'USER',
      content: message,
      conversationId: conversation.id,
    },
  });

  // Run agent with error handling
  let responses;
  try {
    responses = await runAgent(req.params.id, conversation.id, message);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Agent run failed:', errMsg);

    // Save error message to conversation
    const errorResponse = {
      role: 'ASSISTANT' as const,
      content: `I'm sorry, but I encountered an error processing your request. ${errMsg.includes('quota') || errMsg.includes('429') ? 'The AI service quota has been exceeded. Please try again later or configure a different LLM provider.' : 'Please try again or check your LLM provider configuration.'}`,
      metadata: { error: true, originalError: errMsg },
    };

    await prisma.message.create({
      data: {
        role: 'ASSISTANT',
        content: errorResponse.content,
        metadata: errorResponse.metadata as never,
        conversationId: conversation.id,
      },
    });

    return res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        messages: [errorResponse],
      },
    });
  }

  // Save assistant messages
  for (const response of responses) {
    await prisma.message.create({
      data: {
        role: 'ASSISTANT',
        content: response.content,
        metadata: (response.metadata ?? undefined) as never,
        conversationId: conversation.id,
      },
    });
  }

  res.json({
    success: true,
    data: {
      conversationId: conversation.id,
      messages: responses,
    },
  });
});

// Streaming chat endpoint
router.post('/:id/chat/stream', async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message required' });
  }

  // Create or get conversation
  const conversation = conversationId
    ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
    : await prisma.conversation.create({
        data: {
          agentId: req.params.id,
          title: message.slice(0, 100),
        },
      });

  // Save user message
  await prisma.message.create({
    data: {
      role: 'USER',
      content: message,
      conversationId: conversation.id,
    },
  });

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Conversation-Id', conversation.id);
  res.flushHeaders();

  try {
    // Run agent (handles tool calling internally)
    const responses = await runAgent(req.params.id, conversation.id, message);

    // Stream the final response(s)
    for (const response of responses) {
      // Save each response to conversation
      await prisma.message.create({
        data: {
          role: 'ASSISTANT',
          content: response.content,
          metadata: response.metadata as never,
          conversationId: conversation.id,
        },
      });

      // Stream the content
      const content = response.content;
      const chunkSize = 20; // Characters per chunk
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ chunk: '', done: true, conversationId: conversation.id })}\n\n`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Streaming chat failed:', errMsg);

    const errorMsg = errMsg.includes('quota') || errMsg.includes('429')
      ? 'AI service quota exceeded. Please try again later.'
      : 'An error occurred processing your request.';

    res.write(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`);
  }

  res.end();
});

export { router as agentRoutes };
