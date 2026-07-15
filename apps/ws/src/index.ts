import { Server } from 'socket.io';
import { createServer } from 'http';
import { AuthService } from '@agentlab/auth';
import { prisma } from '@agentlab/database';
import { runAgent } from '@agentlab/agents';
import type { ChatMessage, UserRole } from '@agentlab/shared';

const PORT = process.env.WS_PORT || 3002;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = AuthService.verifyToken(token);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    socket.data.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as UserRole,
    };

    next();
  } catch {
    next(new Error('Authentication required'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.data.user.email}`);

  // Join workspace rooms
  socket.on('join-workspace', async (workspaceId: string) => {
    const hasAccess = await prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: socket.data.user.id },
    });

    if (hasAccess) {
      socket.join(`workspace:${workspaceId}`);
      console.log(`${socket.data.user.email} joined workspace ${workspaceId}`);
    }
  });

  // Chat with agent
  socket.on(
    'chat',
    async (data: { agentId: string; message: string; conversationId?: string }) => {
      const { agentId, message, conversationId } = data;

      try {
        // Verify agent access
        const agent = await prisma.agent.findFirst({
          where: {
            id: agentId,
            workspace: { users: { some: { userId: socket.data.user.id } } },
          },
        });

        if (!agent) {
          socket.emit('error', { message: 'Agent not found' });
          return;
        }

        // Create or get conversation
        const conversation = conversationId
          ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
          : await prisma.conversation.create({
              data: {
                agentId,
                title: message.slice(0, 100),
              },
            });

        // Emit user message
        socket.emit('message', {
          role: 'USER',
          content: message,
          conversationId: conversation.id,
        });

        // Save user message
        await prisma.message.create({
          data: {
            role: 'USER',
            content: message,
            conversationId: conversation.id,
          },
        });

        // Run agent with streaming
        const responses = await runAgent(agentId, conversation.id, message);

        // Emit and save assistant messages
        for (const response of responses) {
          socket.emit('message', {
            role: 'ASSISTANT',
            content: response.content,
            metadata: response.metadata,
            conversationId: conversation.id,
          });

          await prisma.message.create({
            data: {
              role: 'ASSISTANT',
              content: response.content,
              metadata: (response.metadata ?? undefined) as never,
              conversationId: conversation.id,
            },
          });
        }
      } catch (error) {
        console.error('Chat error:', error);
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Chat failed',
        });
      }
    }
  );

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.data.user.email}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`AgentLab WebSocket running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down WebSocket server...');
  io.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down WebSocket server...');
  io.close();
  process.exit(0);
});
