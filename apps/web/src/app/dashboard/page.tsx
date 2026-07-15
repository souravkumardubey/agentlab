'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bot, GitBranch, MessageCircle, Wrench } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  model: string;
  description?: string;
  _count: { conversations: number };
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  status: string;
}

const agentTypeConfig: Record<string, { Icon: LucideIcon; label: string }> = {
  CHAT: { Icon: MessageCircle, label: 'Chat' },
  RAG: { Icon: BookOpen, label: 'RAG' },
  ROUTER: { Icon: GitBranch, label: 'Router' },
  WORKFLOW: { Icon: Bot, label: 'Workflow' },
  CUSTOM: { Icon: Wrench, label: 'Custom' },
};

export default function DashboardPage() {
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const router = useRouter();
  const [agentCount, setAgentCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const workspaces = await api.get<Workspace[]>('/api/workspaces', token || undefined);
        if (workspaces.length === 0) {
          setIsLoading(false);
          return;
        }
        const workspaceId = workspaces[0].id;

        const [agents, docs] = await Promise.all([
          api.get<Agent[]>(`/api/agents?workspaceId=${workspaceId}`, token || undefined),
          api.get<Document[]>(`/api/documents?workspaceId=${workspaceId}`, token || undefined),
        ]);

        setAgentCount(agents.length);
        setDocumentCount(docs.length);
        setRecentAgents(agents.slice(0, 5));

        let totalConversations = 0;
        for (const agent of agents) {
          totalConversations += agent._count?.conversations ?? 0;
        }
        setConversationCount(totalConversations);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [hasHydrated, isAuthenticated, token, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  const stats = [
    {
      label: 'Agents',
      value: agentCount,
      description: 'Active agents',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      label: 'Documents',
      value: documentCount,
      description: 'Uploaded files',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: 'Conversations',
      value: conversationCount,
      description: 'Total conversations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Here&apos;s what&apos;s happening with your agents.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--brand-primary)' }}>
                  {stat.icon}
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.description}</span>
              </div>
              <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {isLoading ? (
                  <span className="inline-block w-12 h-8 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface-inset)' }} />
                ) : stat.value}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Agents</h2>
            <Link href="/agents" className="text-sm font-medium transition-colors" style={{ color: 'var(--brand-primary)' }}>
              View all
            </Link>
          </div>
          <div>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: i < 2 ? '1px solid var(--border-default)' : undefined }}>
                  <div className="w-10 h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface-inset)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-inset)' }} />
                    <div className="w-48 h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-inset)' }} />
                  </div>
                </div>
              ))
            ) : recentAgents.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--surface-inset)' }}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5" />
                  </svg>
                </div>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>No agents yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create your first agent to get started</p>
                <Link href="/agents" className="btn-primary inline-flex">
                  Create Agent
                </Link>
              </div>
            ) : (
              recentAgents.map((agent) => {
                const config = agentTypeConfig[agent.type] || agentTypeConfig.CUSTOM;
                const AgentIcon = config.Icon;

                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="px-6 py-4 flex items-center gap-4 transition-colors group"
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-inset)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-primary)' }}>
                      <AgentIcon className="w-5 h-5" strokeWidth={1.6} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {config.label} &middot; {agent.model}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="badge">{agent._count?.conversations ?? 0} chats</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
