import { createWorker, QueueNames, type DocumentProcessingJob, type WorkflowRunJob } from '@agentlab/queue';
import { prisma } from '@agentlab/database';
import { ragEngine } from '@agentlab/rag';

console.log('AgentLab Worker starting...');

/**
 * Safe condition evaluator - only supports simple boolean comparisons.
 * Does NOT use eval() to prevent remote code execution.
 * Supports: field === 'value', field !== 'value', field > N, field < N, field >= N, field <= N
 */
function safeEvalCondition(condition: string, state: Record<string, unknown>): boolean {
  const trimmed = condition.trim();

  // Support simple equality: field === 'value' or field !== 'value'
  const eqMatch = trimmed.match(/^(\w+)\s*(===|!==)\s*['"]?([^'"]+)['"]?$/);
  if (eqMatch) {
    const [, field, operator, expected] = eqMatch;
    const actual = String(state[field] ?? '');
    return operator === '===' ? actual === expected : actual !== expected;
  }

  // Support numeric comparisons: field > N, field < N, field >= N, field <= N
  const cmpMatch = trimmed.match(/^(\w+)\s*(>=|<=|>|<)\s*(\d+)$/);
  if (cmpMatch) {
    const [, field, operator, numStr] = cmpMatch;
    const actual = Number(state[field] ?? 0);
    const expected = Number(numStr);
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      default: return false;
    }
  }

  // Support simple truthiness: field (checks if truthy)
  if (/^\w+$/.test(trimmed)) {
    return Boolean(state[trimmed]);
  }

  console.warn(`Unrecognized condition pattern: "${condition}". Defaulting to false.`);
  return false;
}

/**
 * Topological sort of workflow nodes based on edges.
 * Falls back to array order if no edges exist.
 */
function topologicalSort(
  nodes: Array<Record<string, unknown>>,
  edges: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  if (!edges.length || !nodes.length) return nodes;

  const nodeMap = new Map(nodes.map((n) => [n.id as string, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    const id = node.id as string;
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    const src = edge.source as string;
    const tgt = edge.target as string;
    if (adjacency.has(src) && inDegree.has(tgt)) {
      adjacency.get(src)!.push(tgt);
      inDegree.set(tgt, (inDegree.get(tgt) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: Array<Record<string, unknown>> = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const neighbor of adjacency.get(id) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Append any nodes not reachable from edges (orphans)
  if (sorted.length < nodes.length) {
    const sortedIds = new Set(sorted.map((n) => n.id));
    for (const node of nodes) {
      if (!sortedIds.has(node.id as string)) {
        sorted.push(node);
      }
    }
  }

  return sorted;
}

// Document processing worker
const documentWorker = createWorker<DocumentProcessingJob>(
  QueueNames.DOCUMENT_PROCESSING,
  async (job) => {
    const { documentId } = job.data;
    console.log(`Processing document: ${documentId}`);

    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    if (!document.content) {
      console.log(`Document ${documentId} has no content - skipping processing`);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED', chunkCount: 0 },
      });
      return { chunkCount: 0 };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      const chunkCount = await ragEngine.ingestDocument(documentId, document.content);
      console.log(`Document ${documentId} processed: ${chunkCount} chunks created`);

      return { chunkCount };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Document ${documentId} processing failed:`, errMsg);

      // If embedding fails, still mark as completed (just without RAG capability)
      if (errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('embed') ||
          errMsg.includes('API_KEY') || errMsg.includes('fetch') || errMsg.includes('ECONNREFUSED') ||
          errMsg.includes('missing or empty')) {
        console.log(`Document ${documentId}: Embedding failed, marking as completed without RAG`);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'COMPLETED', chunkCount: 0 },
        });
        return { chunkCount: 0, warning: 'Document stored without embeddings - RAG search unavailable' };
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  },
  { concurrency: 3 }
);

documentWorker.on('completed', (job) => {
  console.log(`Document processing completed: ${job.id}`);
});

documentWorker.on('failed', (job, err) => {
  console.error(`Document processing failed: ${job?.id}`, err);
});

// Workflow run worker
const workflowWorker = createWorker<WorkflowRunJob>(
  QueueNames.WORKFLOW_RUN,
  async (job) => {
    const { workflowId, runId, input } = job.data;
    console.log(`Running workflow: ${workflowId}, run: ${runId}`);

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
      });

      const definition = workflow.definition as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };

      // Topological sort based on edges
      const sortedNodes = topologicalSort(definition.nodes, definition.edges);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentOutput: Record<string, any> = (input as Record<string, any>) || {};
      const nodeResults: Record<string, unknown> = {};

      for (const node of sortedNodes) {
        const nodeType = node.type as string;
        const nodeId = node.id as string;
        const config = (node.config || node.data || {}) as Record<string, unknown>;

        // Skip start/end nodes (no execution needed)
        if (nodeType === 'start' || nodeType === 'end') {
          nodeResults[nodeId] = { status: 'skipped', reason: `${nodeType} node` };
          continue;
        }

        try {
          switch (nodeType) {
            case 'llm': {
              const { getDefaultProvider } = await import('@agentlab/llm');
              const llm = getDefaultProvider();
              const prompt = (config.prompt as string) || (config.template as string) || JSON.stringify(currentOutput);
              const systemPrompt = config.systemPrompt as string;
              
              const messages = [];
              if (systemPrompt) {
                messages.push({ role: 'system' as const, content: systemPrompt });
              }
              messages.push({ role: 'user' as const, content: prompt });
              
              const response = await llm.chat(messages, { model: config.model as string });
              currentOutput = { ...currentOutput, llmResult: response.content, model: response.model };
              nodeResults[nodeId] = { status: 'completed', output: response.content };
              break;
            }
            case 'agent': {
              const agentId = config.agentId as string;
              if (agentId) {
                const { runAgent } = await import('@agentlab/agents');
                const agentMessages = await runAgent(agentId, `workflow-${runId}`, JSON.stringify(currentOutput));
                const agentResponse = agentMessages.map(m => m.content).join('\n');
                currentOutput = { ...currentOutput, agentResult: agentResponse };
                nodeResults[nodeId] = { status: 'completed', output: agentResponse };
              } else {
                currentOutput = { ...currentOutput, agentResult: 'No agent configured' };
                nodeResults[nodeId] = { status: 'skipped', reason: 'No agent configured' };
              }
              break;
            }
            case 'condition': {
              const condition = config.condition as string;
              const result = condition ? safeEvalCondition(condition, currentOutput) : true;
              currentOutput = { ...currentOutput, conditionResult: result };
              nodeResults[nodeId] = { status: 'completed', output: result };
              break;
            }
            case 'transform': {
              const transformType = config.transformType as string;
              const value = config.value as string;
              
              if (transformType === 'extract' && value) {
                const extracted = currentOutput[value];
                currentOutput = { ...currentOutput, transformResult: extracted };
              } else if (transformType === 'format' && value) {
                const formatted = value.replace(/\{\{(\w+)\}\}/g, (_, key) => currentOutput[key] || '');
                currentOutput = { ...currentOutput, transformResult: formatted };
              } else {
                currentOutput = { ...currentOutput, transformResult: currentOutput };
              }
              nodeResults[nodeId] = { status: 'completed', output: currentOutput.transformResult };
              break;
            }
            case 'filter': {
              const filterField = config.field as string;
              const filterValue = config.value as string;
              if (filterField && filterValue) {
                const fieldValue = currentOutput[filterField];
                const match = String(fieldValue) === filterValue;
                currentOutput = { ...currentOutput, filterResult: match };
                nodeResults[nodeId] = { status: 'completed', output: match };
              } else {
                currentOutput = { ...currentOutput, filterResult: true };
                nodeResults[nodeId] = { status: 'completed', output: true };
              }
              break;
            }
            default:
              currentOutput = { ...currentOutput, nodeResult: `${nodeType} node executed` };
              nodeResults[nodeId] = { status: 'completed', output: `${nodeType} executed` };
          }
        } catch (nodeError) {
          nodeResults[nodeId] = { 
            status: 'failed', 
            error: nodeError instanceof Error ? nodeError.message : 'Unknown error' 
          };
          throw nodeError;
        }
      }

      const outputData = JSON.parse(JSON.stringify({ ...currentOutput, nodeResults }));
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { 
          status: 'COMPLETED', 
          output: outputData,
          completedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  },
  { concurrency: 1 }
);

workflowWorker.on('completed', (job) => {
  console.log(`Workflow run completed: ${job.id}`);
});

workflowWorker.on('failed', (job, err) => {
  console.error(`Workflow run failed: ${job?.id}`, err);
});

console.log('Worker listening for jobs...');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await documentWorker.close();
  await workflowWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await documentWorker.close();
  await workflowWorker.close();
  process.exit(0);
});
