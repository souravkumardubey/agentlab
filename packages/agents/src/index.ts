import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { createFallbackProvider, getDefaultProvider } from '@agentlab/llm';
import { ragEngine } from '@agentlab/rag';
import { prisma } from '@agentlab/database';
import { MessageRole, type LLMMessage, type ChatMessage } from '@agentlab/shared';

// Use fallback provider if available, otherwise use default
const getProvider = () => {
  try {
    return createFallbackProvider();
  } catch {
    return getDefaultProvider();
  }
};

// ==================== State Annotation ====================

const AgentState = Annotation.Root({
  messages: Annotation<ChatMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  context: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  agentId: Annotation<string>,
  conversationId: Annotation<string>,
});

type AgentStateType = typeof AgentState.State;

// ==================== Chat Agent Graph ====================

function createChatAgent() {
  const llm = getProvider();

  const callModel = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const agent = await prisma.agent.findUniqueOrThrow({
      where: { id: state.agentId },
    });

    const systemMessage: LLMMessage = {
      role: 'system',
      content: agent.systemPrompt || 'You are a helpful AI assistant.',
    };

    const userMessages: LLMMessage[] = state.messages.map((m) => ({
      role: m.role.toLowerCase() as LLMMessage['role'],
      content: m.content,
    }));

    const response = await llm.chat([systemMessage, ...userMessages], {
      model: agent.model,
    });

    return {
      messages: [
        {
          role: 'ASSISTANT' as MessageRole,
          content: response.content,
          metadata: {
            model: response.model,
            tokenUsage: response.usage,
          },
        },
      ],
    };
  };

  const graph = new StateGraph(AgentState)
    .addNode('agent', callModel)
    .addEdge(START, 'agent')
    .addEdge('agent', END);

  return graph.compile();
}

// ==================== RAG Agent Graph ====================

function createRAGAgent() {
  const llm = getProvider();

  const retrieveDocuments = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (!lastMessage) return { context: [] };

    const results = await ragEngine.search({
      query: lastMessage.content,
      topK: 5,
      scoreThreshold: 0.3,
    });

    return {
      context: results.map((r) => `[Source: ${r.chunk.metadata.documentName}] ${r.chunk.content}`),
    };
  };

  const generateAnswer = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const agent = await prisma.agent.findUniqueOrThrow({
      where: { id: state.agentId },
    });

    const context = state.context.join('\n\n');
    const lastMessage = state.messages[state.messages.length - 1];

    const systemMessage: LLMMessage = {
      role: 'system',
      content: `${agent.systemPrompt || 'You are a helpful document analysis assistant.'}\n\nContext:\n${context}`,
    };

    const response = await llm.chat(
      [systemMessage, { role: 'user', content: lastMessage?.content || '' }],
      { model: agent.model }
    );

    return {
      messages: [
        {
          role: 'ASSISTANT' as MessageRole,
          content: response.content,
          metadata: {
            model: response.model,
            tokenUsage: response.usage,
            sources: state.context.length,
          },
        },
      ],
    };
  };

  const graph = new StateGraph(AgentState)
    .addNode('retrieve', retrieveDocuments)
    .addNode('generate', generateAnswer)
    .addEdge(START, 'retrieve')
    .addEdge('retrieve', 'generate')
    .addEdge('generate', END);

  return graph.compile();
}

// ==================== Router Agent ====================

function createRouterAgent() {
  const llm = getProvider();

  const classifyAndRoute = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastMessage = state.messages[state.messages.length - 1];

    const response = await llm.chat([
      {
        role: 'system',
        content: `Classify the user intent into one of these categories: CHAT, RAG, WORKFLOW.
Respond with just the category name.`,
      },
      { role: 'user', content: lastMessage?.content || '' },
    ]);

    const intent = response.content.trim().toUpperCase();

    if (intent === 'RAG') {
      const agent = await prisma.agent.findUniqueOrThrow({
        where: { id: state.agentId },
      });

      const results = await ragEngine.search({
        query: lastMessage?.content || '',
        topK: 5,
        scoreThreshold: 0.3,
      });

      const context = results.map((r) => `[Source: ${r.chunk.metadata.documentName}] ${r.chunk.content}`).join('\n\n');

      const ragResponse = await llm.chat(
        [
          {
            role: 'system',
            content: `${agent.systemPrompt || 'You are a helpful document analysis assistant.'}\n\nContext:\n${context}`,
          },
          { role: 'user', content: lastMessage?.content || '' },
        ],
        { model: agent.model }
      );

      return {
        messages: [
          {
            role: 'ASSISTANT' as MessageRole,
            content: ragResponse.content,
            metadata: { model: ragResponse.model, intent, sources: results.length },
          },
        ],
      };
    }

    if (intent === 'WORKFLOW') {
      return {
        messages: [
          {
            role: 'ASSISTANT' as MessageRole,
            content: 'Workflow execution is not yet available. Please create and run workflows from the Workflows page.',
            metadata: { intent },
          },
        ],
      };
    }

    // Default: CHAT
    const agent = await prisma.agent.findUniqueOrThrow({
      where: { id: state.agentId },
    });

    const systemMessage: LLMMessage = {
      role: 'system',
      content: agent.systemPrompt || 'You are a helpful AI assistant.',
    };

    const userMessages: LLMMessage[] = state.messages.map((m) => ({
      role: m.role.toLowerCase() as LLMMessage['role'],
      content: m.content,
    }));

    const chatResponse = await llm.chat([systemMessage, ...userMessages], {
      model: agent.model,
    });

    return {
      messages: [
        {
          role: 'ASSISTANT' as MessageRole,
          content: chatResponse.content,
          metadata: { model: chatResponse.model, intent },
        },
      ],
    };
  };

  const graph = new StateGraph(AgentState)
    .addNode('route', classifyAndRoute)
    .addEdge(START, 'route')
    .addEdge('route', END);

  return graph.compile();
}

// ==================== Agent Factory ====================

export type AgentType = 'CHAT' | 'RAG' | 'ROUTER' | 'WORKFLOW' | 'CUSTOM';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentCache: Record<string, any> = {};

function getOrCreateAgent(type: AgentType) {
  if (!agentCache[type]) {
    switch (type) {
      case 'RAG': agentCache[type] = createRAGAgent(); break;
      case 'ROUTER': agentCache[type] = createRouterAgent(); break;
      default: agentCache[type] = createChatAgent(); break;
    }
  }
  return agentCache[type];
}

export function getAgent(type: AgentType) {
  return getOrCreateAgent(type);
}

export async function runAgent(
  agentId: string,
  conversationId: string,
  message: string
): Promise<ChatMessage[]> {
  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
  });

  // Fetch conversation history for multi-turn context
  const historyMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  const messages: ChatMessage[] = historyMessages.map((m) => ({
    role: m.role as MessageRole,
    content: m.content,
  }));

  // Append the current user message if not already in history
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== MessageRole.USER || lastMsg.content !== message) {
    messages.push({ role: MessageRole.USER, content: message });
  }

  const graph = getAgent(agent.type as AgentType);

  const result = await graph.invoke({
    messages,
    context: [],
    agentId,
    conversationId,
  });

  return result.messages.filter((m: ChatMessage) => m.role === MessageRole.ASSISTANT);
}

export { createChatAgent, createRAGAgent, createRouterAgent };
