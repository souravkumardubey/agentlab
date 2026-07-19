'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bot, GitBranch, MessageCircle, Wrench } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  type: string;
  model: string;
  systemPrompt?: string;
  _count: { conversations: number };
  createdAt: string;
}

const agentTypeConfig: Record<string, { Icon: LucideIcon; label: string }> = {
  CHAT: { Icon: MessageCircle, label: 'Chat' },
  RAG: { Icon: BookOpen, label: 'RAG' },
  ROUTER: { Icon: GitBranch, label: 'Router' },
  WORKFLOW: { Icon: Bot, label: 'Workflow' },
  CUSTOM: { Icon: Wrench, label: 'Custom' },
};

export default function AgentsPage() {
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'CHAT',
    model: 'gemini-2.0-flash',
    systemPrompt: '',
    tools: [] as string[],
  });

  const availableTools = [
    { name: 'calculator', label: 'Calculator', description: 'Evaluate mathematical expressions' },
    { name: 'get_current_datetime', label: 'Date & Time', description: 'Get current date and time' },
    { name: 'http_request', label: 'HTTP Request', description: 'Make API calls to external services' },
    { name: 'web_search', label: 'Web Search', description: 'Search the web (requires API key)' },
  ];

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && workspaceId) {
      fetchAgents();
    }
  }, [hasHydrated, isAuthenticated, workspaceId]);

  const fetchAgents = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const data = await api.get<Agent[]>(`/api/agents?workspaceId=${workspaceId}`, token || undefined);
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setIsCreating(true);

    try {
      await api.post('/api/agents', {
        ...form,
        workspaceId,
      }, token || undefined);

      toast.success('Agent created successfully');
      setShowCreateModal(false);
      setForm({ name: '', description: '', type: 'CHAT', model: 'gemini-2.0-flash', systemPrompt: '', tools: [] });
      fetchAgents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    const config = (agent as any).config || {};
    setForm({
      name: agent.name,
      description: agent.description || '',
      type: agent.type,
      model: agent.model,
      systemPrompt: (agent as any).systemPrompt || '',
      tools: config.tools || [],
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setIsEditing(true);

    try {
      await api.put(`/api/agents/${editingAgent.id}`, {
        name: form.name,
        description: form.description,
        type: form.type,
        model: form.model,
        systemPrompt: form.systemPrompt,
        tools: form.tools,
      }, token || undefined);

      toast.success('Agent updated successfully');
      setShowEditModal(false);
      setEditingAgent(null);
      setForm({ name: '', description: '', type: 'CHAT', model: 'gemini-2.0-flash', systemPrompt: '', tools: [] });
      fetchAgents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent');
    } finally {
      setIsEditing(false);
    }
  };

  const openDeleteDialog = (agent: Agent) => {
    setDeleteTarget(agent);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/agents/${deleteTarget.id}`, token || undefined);
      toast.success('Agent deleted successfully');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchAgents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete agent');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Agents</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Create and manage your AI agents</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Agent
          </button>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-inset)' }} />
                  <div className="w-16 h-5 rounded-full" style={{ background: 'var(--surface-inset)' }} />
                </div>
                <div className="w-32 h-5 rounded mb-2" style={{ background: 'var(--surface-inset)' }} />
                <div className="w-48 h-4 rounded mb-4" style={{ background: 'var(--surface-inset)' }} />
                <div className="flex gap-2">
                  <div className="flex-1 h-9 rounded-xl" style={{ background: 'var(--surface-inset)' }} />
                  <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--surface-inset)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--brand-softer)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--brand-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No agents yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Create your first agent to start building</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create your first agent
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent) => {
              const config = agentTypeConfig[agent.type] || agentTypeConfig.CUSTOM;
              const AgentIcon = config.Icon;
              return (
                <div key={agent.id} className="card card-hover p-6 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-softer)' }}>
                      <AgentIcon className="w-6 h-6" strokeWidth={1.6} style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <span className="badge badge-brand">{config.label}</span>
                  </div>
                  <Link href={`/agents/${agent.id}`}>
                    <h3 className="text-lg font-semibold mb-1 group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>{agent.name}</h3>
                  </Link>
                  {agent.description && (
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-mono text-xs">{agent.model}</span>
                    <span>{agent._count.conversations} chats</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(agent)}
                      className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteDialog(agent)}
                      className="btn btn-danger btn-sm flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Agent</h2>
            </div>
            <form onSubmit={handleCreate} className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full px-4 py-3"
                  placeholder="My Agent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full px-4 py-3"
                  placeholder="What does this agent do?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input w-full px-4 py-3"
                  >
                    <option value="CHAT">Chat</option>
                    <option value="RAG">RAG</option>
                    <option value="ROUTER">Router</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Model</label>
                  <select
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="input w-full px-4 py-3"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="moonshot-v1-8k">Kimi Moonshot 8K</option>
                    <option value="moonshot-v1-32k">Kimi Moonshot 32K</option>
                    <option value="moonshot-v1-128k">Kimi Moonshot 128K</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="llama3.1">Llama 3.1 (Ollama)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="input w-full px-4 py-3 resize-none"
                  rows={3}
                  placeholder="Optional instructions for the agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Tools
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <div className="space-y-2">
                  {availableTools.map((tool) => (
                    <label
                      key={tool.name}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: form.tools.includes(tool.name) ? 'var(--brand-softer)' : 'var(--surface-inset)',
                        border: `1px solid ${form.tools.includes(tool.name) ? 'var(--brand-soft)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.tools.includes(tool.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, tools: [...form.tools, tool.name] });
                          } else {
                            setForm({ ...form, tools: form.tools.filter((t) => t !== tool.name) });
                          }
                        }}
                        className="mt-0.5"
                        style={{ accentColor: 'var(--brand-primary)' }}
                      />
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {tool.label}
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {tool.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="btn btn-primary">
                  {isCreating ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAgent && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingAgent(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Agent</h2>
            </div>
            <form onSubmit={handleEdit} className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input w-full px-4 py-3"
                  >
                    <option value="CHAT">Chat</option>
                    <option value="RAG">RAG</option>
                    <option value="ROUTER">Router</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Model</label>
                  <select
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="input w-full px-4 py-3"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="moonshot-v1-8k">Kimi Moonshot 8K</option>
                    <option value="moonshot-v1-32k">Kimi Moonshot 32K</option>
                    <option value="moonshot-v1-128k">Kimi Moonshot 128K</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="llama3.1">Llama 3.1 (Ollama)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="input w-full px-4 py-3 resize-none"
                  rows={3}
                  placeholder="Optional instructions for the agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Tools
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <div className="space-y-2">
                  {availableTools.map((tool) => (
                    <label
                      key={tool.name}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: form.tools.includes(tool.name) ? 'var(--brand-softer)' : 'var(--surface-inset)',
                        border: `1px solid ${form.tools.includes(tool.name) ? 'var(--brand-soft)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.tools.includes(tool.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, tools: [...form.tools, tool.name] });
                          } else {
                            setForm({ ...form, tools: form.tools.filter((t) => t !== tool.name) });
                          }
                        }}
                        className="mt-0.5"
                        style={{ accentColor: 'var(--brand-primary)' }}
                      />
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {tool.label}
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {tool.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingAgent(null); }} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isEditing} className="btn btn-primary">
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && deleteTarget && (
        <div className="modal-overlay" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-danger-soft)' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--color-danger)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Agent</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn btn-danger flex-1"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
