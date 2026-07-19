import OpenAI from 'openai';
import type { LLMMessage, LLMOptions, LLMResponse, LLMToolCall, LLMToolDefinition, EmbeddingOptions } from '@agentlab/shared';

export interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  chatStream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<string>;
  embed(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
  models(): Promise<string[]>;
}

// ==================== OpenAI ====================

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; baseUrl?: string; model?: string } = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl,
    });
    this.defaultModel = config.model || 'gpt-4o-mini';
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: options.model || this.defaultModel,
      messages: messages.map((m) => {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        if (m.role === 'tool') {
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
      }),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
      params.tool_choice = options.tool_choice || 'auto';
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];
    const message = choice.message;

    let toolCalls: LLMToolCall[] | undefined;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return {
      content: message?.content || '',
      model: response.model,
      toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: options.model || 'text-embedding-3-small',
      input: texts,
      dimensions: options.dimensions || 1536,
    });

    return response.data.map((item) => item.embedding);
  }

  async models(): Promise<string[]> {
    const response = await this.client.models.list();
    return response.data.map((m) => m.id);
  }
}

// ==================== Together.ai ====================

export class TogetherProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.TOGETHER_API_KEY,
      baseURL: 'https://api.together.xyz/v1',
    });
    this.defaultModel = config.model || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: options.model || this.defaultModel,
      messages: messages.map((m) => {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        if (m.role === 'tool') {
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
      }),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
      params.tool_choice = options.tool_choice || 'auto';
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];
    const message = choice.message;

    let toolCalls: LLMToolCall[] | undefined;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return {
      content: message?.content || '',
      model: response.model,
      toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: options.model || 'togethercomputer/m2-bert-80M-8k-retrieval',
      input: texts,
      dimensions: options.dimensions || 1536,
    });

    return response.data.map((item) => item.embedding);
  }

  async models(): Promise<string[]> {
    return [
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ];
  }
}

// ==================== Groq (FREE tier) ====================

export class GroqProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.defaultModel = config.model || 'llama-3.1-70b-versatile';
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: options.model || this.defaultModel,
      messages: messages.map((m) => {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        if (m.role === 'tool') {
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
      }),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
      params.tool_choice = options.tool_choice || 'auto';
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];
    const message = choice.message;

    let toolCalls: LLMToolCall[] | undefined;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return {
      content: message?.content || '',
      model: response.model,
      toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    // Groq doesn't support embeddings — use Gemini (free) if available, else OpenAI
    if (process.env.GEMINI_API_KEY) {
      const gemini = new GeminiProvider();
      return gemini.embed(texts, options);
    }
    const fallback = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await fallback.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: options.dimensions || 1536,
    });
    return response.data.map((item) => item.embedding);
  }

  async models(): Promise<string[]> {
    return [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ];
  }
}

// ==================== Ollama (LOCAL, free) ====================

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: { baseUrl?: string; model?: string } = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config.model || process.env.OLLAMA_MODEL || 'llama3.1';
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      model,
      messages: messages.map((m) => {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || '',
            tool_calls: m.tool_calls.map((tc) => ({
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          };
        }
        if (m.role === 'tool') {
          return { role: 'tool', content: m.content };
        }
        return { role: m.role.toLowerCase(), content: m.content };
      }),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 4096,
      },
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    // Parse tool calls from Ollama response
    let toolCalls: LLMToolCall[] | undefined;
    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      toolCalls = data.message.tool_calls.map((tc: any, index: number) => ({
        id: `call_${model}_${index}`,
        name: tc.function?.name || '',
        arguments: tc.function?.arguments || {},
      }));
    }

    return {
      content: data.message?.content || '',
      model,
      toolCalls,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const model = options.model || this.defaultModel;
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) yield json.message.content;
        } catch {}
      }
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding error: ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      embeddings.push(data.embedding);
    }

    return embeddings;
  }

  async models(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }
}

// ==================== Google Gemini (FREE tier) ====================

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private defaultModel: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: { apiKey?: string; model?: string } = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = config.model || 'gemini-2.0-flash';
  }

  private convertMessages(messages: LLMMessage[]): { role: string; parts: { text: string }[] }[] {
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    const contents = this.convertMessages(messages);

    // Extract system instruction if first message is system
    let systemInstruction: { parts: { text: string }[] } | undefined;
    if (contents.length > 0 && messages[0].role === 'system') {
      systemInstruction = contents.shift()!;
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error: any = await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${error.error?.message || response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const model = options.model || this.defaultModel;
    const contents = this.convertMessages(messages);

    let systemInstruction: { parts: { text: string }[] } | undefined;
    if (contents.length > 0 && messages[0].role === 'system') {
      systemInstruction = contents.shift()!;
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {}
        }
      }
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const model = 'text-embedding-004';
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, content: { parts: [{ text }] } }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini embedding error: ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      embeddings.push(data.embedding?.values || []);
    }

    return embeddings;
  }

  async models(): Promise<string[]> {
    return [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];
  }
}

// ==================== Kimi / Moonshot AI ====================

export class KimiProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.KIMI_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    });
    this.defaultModel = config.model || 'moonshot-v1-8k';
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: options.model || this.defaultModel,
      messages: messages.map((m) => {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        if (m.role === 'tool') {
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
      }),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
      params.tool_choice = options.tool_choice || 'auto';
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];
    const message = choice.message;

    let toolCalls: LLMToolCall[] | undefined;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return {
      content: message?.content || '',
      model: response.model,
      toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'moonshot-v1-8k-latest',
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }

  async models(): Promise<string[]> {
    return [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ];
  }
}

// ==================== Provider Factory ====================

export function createLLMProvider(provider: string = 'openai'): LLMProvider {
  switch (provider) {
    case 'together': return new TogetherProvider();
    case 'groq': return new GroqProvider();
    case 'ollama': return new OllamaProvider();
    case 'gemini': return new GeminiProvider();
    case 'kimi': return new KimiProvider();
    default: return new OpenAIProvider();
  }
}

export function getDefaultProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'openai';
  return createLLMProvider(provider);
}

// Fallback provider that tries multiple providers in order
export class FallbackProvider implements LLMProvider {
  private providers: LLMProvider[];
  private currentIndex = 0;

  constructor(providers: LLMProvider[]) {
    this.providers = providers;
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentIndex + i) % this.providers.length;
      try {
        const result = await this.providers[providerIndex].chat(messages, options);
        this.currentIndex = providerIndex;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${providerIndex} failed:`, lastError.message);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  async *chatStream(messages: LLMMessage[], options: LLMOptions = {}): AsyncGenerator<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentIndex + i) % this.providers.length;
      try {
        const generator = this.providers[providerIndex].chatStream(messages, options);
        // Manually iterate to catch errors mid-stream
        while (true) {
          const result = generator.next();
          const value = await result;
          if (value.done) break;
          yield value.value;
        }
        this.currentIndex = providerIndex;
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${providerIndex} stream failed:`, lastError.message);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentIndex + i) % this.providers.length;
      try {
        const result = await this.providers[providerIndex].embed(texts, options);
        this.currentIndex = providerIndex;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${providerIndex} embed failed:`, lastError.message);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  async models(): Promise<string[]> {
    return this.providers[this.currentIndex].models();
  }
}

export function createFallbackProvider(): LLMProvider {
  const providers: LLMProvider[] = [];

  // Add providers based on available API keys
  if (process.env.GROQ_API_KEY) providers.push(new GroqProvider());
  if (process.env.GEMINI_API_KEY) providers.push(new GeminiProvider());
  if (process.env.OPENAI_API_KEY) providers.push(new OpenAIProvider());
  if (process.env.TOGETHER_API_KEY) providers.push(new TogetherProvider());
  if (process.env.KIMI_API_KEY) providers.push(new KimiProvider());

  // Always try Ollama as last resort (local)
  providers.push(new OllamaProvider());

  if (providers.length === 1) {
    return providers[0];
  }

  return new FallbackProvider(providers);
}
