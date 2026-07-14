import { Queue, Worker, type Job, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Cast to avoid type mismatch between ioredis versions
const bullmqConnection = connection as any;

// ==================== Queue Names ====================

export const QueueNames = {
  DOCUMENT_PROCESSING: 'document-processing',
  EMBEDDING: 'embedding',
  AGENT_EXECUTION: 'agent-execution',
  WORKFLOW_RUN: 'workflow-run',
  NOTIFICATION: 'notification',
} as const;

// ==================== Queue Definitions ====================

export const documentProcessingQueue = new Queue(QueueNames.DOCUMENT_PROCESSING, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const embeddingQueue = new Queue(QueueNames.EMBEDDING, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const agentExecutionQueue = new Queue(QueueNames.AGENT_EXECUTION, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const workflowRunQueue = new Queue(QueueNames.WORKFLOW_RUN, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1,
  },
});

// ==================== Job Types ====================

export interface DocumentProcessingJob {
  documentId: string;
  workspaceId: string;
}

export interface EmbeddingJob {
  documentId: string;
  content: string;
}

export interface AgentExecutionJob {
  agentId: string;
  conversationId: string;
  message: string;
}

export interface WorkflowRunJob {
  workflowId: string;
  runId: string;
  input: unknown;
}

// ==================== Worker Factory ====================

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>,
  options?: Omit<WorkerOptions, 'connection'>
): Worker<T> {
  return new Worker<T>(queueName, processor, {
    connection: bullmqConnection,
    concurrency: 5,
    ...options,
  });
}

export { connection as redisConnection };
