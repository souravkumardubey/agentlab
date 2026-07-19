/**
 * Tool Execution Engine — handles tool execution with database persistence.
 *
 * Persists tool calls to the `tool_calls` table, tracks status and timing,
 * and returns structured results for the agent graph.
 */

import { prisma } from '@agentlab/database';
import { executeTool, type ToolCallResult } from './tools';

// ==================== Types ====================

export interface PersistedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  status: 'success' | 'error';
  durationMs: number;
  dbId: string;
}

// ==================== Tool Executor ====================

/**
 * Execute a tool call and persist it to the database.
 *
 * @param agentId - The agent making the tool call
 * @param messageId - Optional message ID to associate the tool call with
 * @param toolName - Name of the tool to execute
 * @param args - Arguments to pass to the tool
 * @returns The persisted tool call result
 */
export async function executeAndPersistToolCall(
  agentId: string,
  messageId: string | null,
  toolName: string,
  args: Record<string, unknown>
): Promise<PersistedToolCall> {
  // Create the tool call record with status "running"
  const dbRecord = await prisma.toolCall.create({
    data: {
      name: toolName,
      arguments: args as any, // Prisma JSON type cast
      status: 'running',
      agentId,
      messageId: messageId || undefined,
    },
  });

  // Execute the tool
  const result = await executeTool(toolName, args);

  // Update the record with the result
  await prisma.toolCall.update({
    where: { id: dbRecord.id },
    data: {
      result: result.result,
      status: result.status === 'success' ? 'completed' : 'failed',
      completedAt: new Date(),
    },
  });

  return {
    id: result.id,
    name: result.name,
    arguments: result.arguments,
    result: result.result,
    status: result.status,
    durationMs: result.durationMs,
    dbId: dbRecord.id,
  };
}

/**
 * Execute multiple tool calls and persist them all.
 *
 * @param agentId - The agent making the tool calls
 * @param messageId - Optional message ID to associate with
 * @param toolCalls - Array of {name, arguments} to execute
 * @returns Array of persisted tool call results
 */
export async function executeAndPersistToolCalls(
  agentId: string,
  messageId: string | null,
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>
): Promise<PersistedToolCall[]> {
  // Execute sequentially to avoid race conditions on DB writes
  const results: PersistedToolCall[] = [];
  for (const tc of toolCalls) {
    const result = await executeAndPersistToolCall(agentId, messageId, tc.name, tc.arguments);
    results.push(result);
  }
  return results;
}

/**
 * Get all tool calls for a specific message.
 */
export async function getToolCallsForMessage(messageId: string) {
  return prisma.toolCall.findMany({
    where: { messageId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get all tool calls for an agent (with pagination).
 */
export async function getToolCallsForAgent(
  agentId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const [calls, total] = await Promise.all([
    prisma.toolCall.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.toolCall.count({ where: { agentId } }),
  ]);

  return { calls, total };
}
