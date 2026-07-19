export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum AgentType {
  ROUTER = 'ROUTER',
  RAG = 'RAG',
  CHAT = 'CHAT',
  WORKFLOW = 'WORKFLOW',
  CUSTOM = 'CUSTOM',
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL',
}

export enum RunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  CANCELLED = 'CANCELLED',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ==================== API Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// ==================== Auth Types ====================

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

// ==================== Agent Types ====================

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  systemPrompt?: string;
  ragConfig?: {
    documentIds?: string[];
    topK?: number;
    scoreThreshold?: number;
  };
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ==================== RAG Types ====================

export interface ChunkMetadata {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  page?: number;
  section?: string;
}

export interface SearchResult {
  chunk: {
    id: string;
    content: string;
    metadata: ChunkMetadata;
  };
  score: number;
}

export interface SearchRequest {
  query: string;
  topK?: number;
  scoreThreshold?: number;
  documentIds?: string[];
}

// ==================== Workflow Types ====================

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowRunResult {
  runId: string;
  status: RunStatus;
  output?: unknown;
  error?: string;
}

// ==================== LLM Types ====================

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: LLMToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

export interface LLMResponse {
  content: string;
  model: string;
  toolCalls?: LLMToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}
