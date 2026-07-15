import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@agentlab/database';
import { authenticate } from '../middleware/auth.js';
import { workflowRunQueue } from '@agentlab/queue';

const router = Router();

router.use(authenticate);

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: z.object({
    nodes: z.array(z.record(z.unknown())),
    edges: z.array(z.record(z.unknown())),
  }),
  workspaceId: z.string(),
});

router.get('/', async (req, res) => {
  const { workspaceId } = req.query;

  const workflows = await prisma.workflow.findMany({
    where: {
      workspaceId: workspaceId as string,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    include: { _count: { select: { runs: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: workflows });
});

router.post('/', async (req, res) => {
  const body = createWorkflowSchema.parse(req.body);

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: body.workspaceId,
      users: { some: { userId: req.user!.id } },
    },
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: body.name,
      description: body.description,
      definition: body.definition as never,
      workspaceId: body.workspaceId,
    },
  });

  res.status(201).json({ success: true, data: workflow });
});

router.get('/:id', async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    include: { runs: { take: 10, orderBy: { createdAt: 'desc' } } },
  });

  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  res.json({ success: true, data: workflow });
});

router.put('/:id', async (req, res) => {
  const workflow = await prisma.workflow.update({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    data: {
      name: req.body.name,
      description: req.body.description,
      definition: req.body.definition,
    },
  });

  res.json({ success: true, data: workflow });
});

router.delete('/:id', async (req, res) => {
  await prisma.workflow.delete({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
  });

  res.json({ success: true, message: 'Workflow deleted' });
});

router.post('/:id/run', async (req, res) => {
  const { input } = req.body;

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: req.params.id,
      input,
      status: 'PENDING',
    },
  });

  await workflowRunQueue.add('run-workflow', {
    workflowId: req.params.id,
    runId: run.id,
    input,
  });

  res.json({ success: true, data: run });
});

router.get('/:id/runs', async (req, res) => {
  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: runs });
});

export { router as workflowRoutes };
