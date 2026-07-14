import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agentlab.io' },
    update: {},
    create: {
      email: 'admin@agentlab.io',
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create default workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      description: 'Default workspace for AgentLab',
      users: {
        create: {
          userId: admin.id,
          role: 'ADMIN',
        },
      },
    },
  });
  console.log(`Created workspace: ${workspace.name}`);

  // Create default agents
  const chatAgent = await prisma.agent.create({
    data: {
      name: 'General Assistant',
      description: 'A helpful general-purpose chat assistant',
      type: 'CHAT',
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are a helpful AI assistant. Be concise and helpful.',
      workspaceId: workspace.id,
    },
  });
  console.log(`Created chat agent: ${chatAgent.name}`);

  const ragAgent = await prisma.agent.create({
    data: {
      name: 'Document Q&A',
      description: 'Ask questions about your uploaded documents',
      type: 'RAG',
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are a document analysis assistant. Answer questions based on the provided context. Always cite your sources.',
      workspaceId: workspace.id,
      config: {
        ragConfig: {
          topK: 5,
          scoreThreshold: 0.7,
        },
      },
    },
  });
  console.log(`Created RAG agent: ${ragAgent.name}`);

  const routerAgent = await prisma.agent.create({
    data: {
      name: 'Router',
      description: 'Routes requests to specialized agents',
      type: 'ROUTER',
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are a routing agent. Classify user intent and delegate to the appropriate specialist.',
      workspaceId: workspace.id,
    },
  });
  console.log(`Created router agent: ${routerAgent.name}`);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
