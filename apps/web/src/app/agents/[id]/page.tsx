'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Markdown } from '@/components/markdown';
import { ToolCallsDisplay } from '@/components/chat/tool-calls';
import { api } from '@/lib/api';
import { Bot } from 'lucide-react';

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status?: 'success' | 'error' | 'running';
  durationMs?: number;
}

interface Message {
  id?: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  toolCalls?: ToolCall[];
  createdAt?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  model: string;
  systemPrompt?: string;
}

interface Conversation {
  id: string;
  title?: string;
  createdAt: string;
  _count?: { messages: number };
}

export default function AgentChatPage() {
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchAgent = async () => {
      try {
        const data = await api.get<Agent>(`/api/agents/${agentId}`, token || undefined);
        setAgent(data);
      } catch (err) {
        console.error('Failed to fetch agent:', err);
        router.push('/agents');
      }
    };

    const fetchConversations = async () => {
      try {
        const data = await api.get<Conversation[]>(
          `/api/conversations?agentId=${agentId}`,
          token || undefined
        );
        setConversations(data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    };

    fetchAgent();
    fetchConversations();
  }, [hasHydrated, isAuthenticated, token, agentId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearchConversations = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchConversations();
      return;
    }

    setIsSearching(true);
    try {
      const data = await api.get<Conversation[]>(
        `/api/conversations/search?q=${encodeURIComponent(query)}&agentId=${agentId}`,
        token || undefined
      );
      setConversations(data);
    } catch (err) {
      console.error('Failed to search conversations:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await api.get<Conversation[]>(
        `/api/conversations?agentId=${agentId}`,
        token || undefined
      );
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const handleStartRename = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setEditTitle(conv.title || '');
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    
    try {
      await api.put(`/api/conversations/${id}`, { title: editTitle.trim() }, token || undefined);
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title: editTitle.trim() } : c
      ));
      setEditingConversationId(null);
      setEditTitle('');
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleCancelRename = () => {
    setEditingConversationId(null);
    setEditTitle('');
  };

  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setMessages([]);
    setIsLoading(true);
    try {
      const data = await api.get<{ messages: Message[] }>(
        `/api/conversations/${id}`,
        token || undefined
      );
      setMessages(data.messages || []);
      setConversationId(id);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setConversationId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'USER', content: userMessage }]);
    setIsLoading(true);

    // Add placeholder for streaming response
    const streamingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: 'ASSISTANT', content: '' },
    ]);

    try {
      await api.stream(
        `/api/agents/${agentId}/chat/stream`,
        { message: userMessage, conversationId },
        {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          },
          onDone: (convId) => {
            if (convId) {
              setConversationId(convId);
              if (!activeConversationId) {
                setActiveConversationId(convId);
                setConversations((prev) => [
                  { id: convId, title: userMessage.slice(0, 50), createdAt: new Date().toISOString(), _count: { messages: 2 } },
                  ...prev,
                ]);
              }
            }
            setIsLoading(false);
          },
          onError: (error) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, content: error || 'Sorry, an error occurred. Please try again.' }
                  : m
              )
            );
            setIsLoading(false);
          },
        },
        token || undefined
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, content: 'Sorry, an error occurred. Please try again.' }
            : m
        )
      );
      setIsLoading(false);
    }
  };

  if (!hasHydrated || !isAuthenticated || !agent) return null;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100dvh-4rem)] lg:h-screen -m-4 sm:-m-6 lg:-m-8">
        {/* Conversation Sidebar */}
        <div
          className="w-72 flex flex-col"
          style={{
            background: 'var(--surface-sidebar)',
            borderRight: '1px solid var(--border-default)',
          }}
        >
          <div
            className="p-4 space-y-3"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            {/* Search Bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                style={{ color: 'var(--text-muted)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchConversations(e.target.value)}
                placeholder="Search conversations..."
                className="input w-full pl-10 pr-3 py-2 text-sm"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
            
            <button
              onClick={handleNewConversation}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group mx-2 mb-1"
                  style={{ width: 'calc(100% - 16px)' }}
                >
                  {editingConversationId === conv.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        className="input flex-1 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(conv.id)}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--color-success)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => handleSelectConversation(conv.id)}
                        className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200"
                        style={{
                          background: activeConversationId === conv.id ? 'var(--brand-soft)' : 'transparent',
                          color: activeConversationId === conv.id ? 'var(--brand-primary)' : 'var(--text-muted)',
                          borderLeft: activeConversationId === conv.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
                        }}
                      >
                        <p className="text-sm font-medium truncate pr-8">
                          {conv.title || 'New conversation'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {new Date(conv.createdAt).toLocaleDateString()}
                          {conv._count?.messages ? ` · ${conv._count.messages} msgs` : ''}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="px-6 py-4"
            style={{
              background: 'var(--surface-card)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/agents')}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'var(--brand-softer)',
                  border: '1px solid var(--brand-soft)',
                  color: 'var(--brand-primary)',
                }}
              >
                <Bot className="w-5 h-5" strokeWidth={1.6} />
              </div>
              <div>
                <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{agent.type} · {agent.model}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: 'var(--brand-softer)',
                    border: '1px solid var(--brand-soft)',
                  }}
                >
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Start a conversation</h3>
                <p className="max-w-sm" style={{ color: 'var(--text-secondary)' }}>Send a message to begin chatting with {agent.name}</p>
              </div>
            )}

            {messages.map((message, i) => (
              <div
                key={message.id || i}
                className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${message.role === 'USER' ? '' : 'flex gap-3'}`}>
                  {message.role !== 'USER' && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        background: 'var(--brand-softer)',
                        border: '1px solid var(--brand-soft)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      <Bot className="w-4 h-4" strokeWidth={1.6} />
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={
                      message.role === 'USER'
                        ? {
                            background: 'var(--brand-primary)',
                            color: 'var(--text-inverse)',
                            borderRadius: '18px',
                          }
                        : {
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '18px',
                          }
                    }
                  >
                    {message.role === 'USER' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <>
                        <Markdown className="text-sm leading-relaxed">{message.content}</Markdown>
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <ToolCallsDisplay toolCalls={message.toolCalls} />
                        )}
                      </>
                    )}
                    {message.metadata && (
                      <div
                        className="mt-2 pt-2 text-xs"
                        style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                      >
                        {'model' in message.metadata && <span>Model: {String(message.metadata.model)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'var(--brand-softer)',
                      border: '1px solid var(--brand-soft)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    <Bot className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '18px',
                    }}
                  >
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--brand-primary)' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s]" style={{ background: 'var(--brand-primary)' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: 'var(--brand-primary)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="px-6 py-4"
            style={{
              background: 'var(--surface-card)',
              borderTop: '1px solid var(--border-default)',
            }}
          >
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="input flex-1 px-4 py-3"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="btn btn-primary px-6 py-3 flex items-center gap-2"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
