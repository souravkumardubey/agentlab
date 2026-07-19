/**
 * Tool Registry — defines the Tool interface and registry system for agent tool use.
 *
 * Tools are functions that agents can call to interact with external systems.
 * Each tool has a name, description, JSON Schema for parameters, and an execute function.
 */

// ==================== Tool Interface ====================

export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

export interface ToolDefinition {
  /** Unique tool name (e.g., "web_search") */
  name: string;
  /** Human-readable description for the LLM */
  description: string;
  /** JSON Schema for the tool's parameters */
  parameters: ToolParameters;
  /** Function that executes the tool */
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  status: 'success' | 'error';
  durationMs: number;
}

// ==================== Tool Registry ====================

const toolRegistry = new Map<string, ToolDefinition>();

/**
 * Register a tool in the global registry.
 */
export function registerTool(tool: ToolDefinition): void {
  if (toolRegistry.has(tool.name)) {
    console.warn(`Tool "${tool.name}" is being re-registered. Overwriting previous definition.`);
  }
  toolRegistry.set(tool.name, tool);
}

/**
 * Register multiple tools at once.
 */
export function registerTools(tools: ToolDefinition[]): void {
  for (const tool of tools) {
    registerTool(tool);
  }
}

/**
 * Get a tool by name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools.
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tools by their names.
 */
export function getToolsByNames(names: string[]): ToolDefinition[] {
  return names
    .map((name) => toolRegistry.get(name))
    .filter((tool): tool is ToolDefinition => tool !== undefined);
}

/**
 * Convert a ToolDefinition to OpenAI-compatible function format for LLM API calls.
 */
export function toolToOpenAIFunction(tool: ToolDefinition): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
} {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Convert multiple tools to OpenAI-compatible format.
 */
export function toolsToOpenAIFunctions(tools: ToolDefinition[]): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}> {
  return tools.map(toolToOpenAIFunction);
}

/**
 * Execute a tool by name with the given arguments.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const tool = toolRegistry.get(name);
  const start = Date.now();

  if (!tool) {
    return {
      id: crypto.randomUUID(),
      name,
      arguments: args,
      result: `Error: Tool "${name}" not found.`,
      status: 'error',
      durationMs: Date.now() - start,
    };
  }

  try {
    const result = await tool.execute(args);
    return {
      id: crypto.randomUUID(),
      name,
      arguments: args,
      result,
      status: 'success',
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: crypto.randomUUID(),
      name,
      arguments: args,
      result: `Error executing tool "${name}": ${message}`,
      status: 'error',
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Execute multiple tool calls in parallel.
 */
export async function executeToolCalls(
  requests: ToolCallRequest[]
): Promise<ToolCallResult[]> {
  return Promise.all(
    requests.map((req) => executeTool(req.name, req.arguments))
  );
}

/**
 * Check if a tool is registered.
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name);
}

/**
 * Get the names of all registered tools.
 */
export function getToolNames(): string[] {
  return Array.from(toolRegistry.keys());
}
