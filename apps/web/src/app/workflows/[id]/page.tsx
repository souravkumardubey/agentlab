'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { WorkflowCanvas } from '@/components/workflows/workflow-canvas';
import { NodePalette } from '@/components/workflows/node-palette';
import { NodeConfigPanel } from '@/components/workflows/node-config-panel';
import { api } from '@/lib/api';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: { nodes: Node[]; edges: Edge[] };
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
}

function WorkflowEditor() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && workflowId) {
      loadWorkflow();
      loadAgents();
    }
  }, [hasHydrated, isAuthenticated, workflowId]);

  const loadWorkflow = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Workflow>(`/api/workflows/${workflowId}`, token || undefined);
      setWorkflow(data);
      setNodes(data.definition?.nodes || []);
      setEdges(data.definition?.edges || []);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<Agent[]>(`/api/agents?workspaceId=${workspaceId}`, token || undefined);
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        return updated;
      });
      // Handle selection
      const selectChange = changes.find((c) => c.type === 'select');
      if (selectChange && 'selected' in selectChange) {
        if (selectChange.selected) {
          setNodes((nds) => {
            const node = nds.find((n) => n.id === selectChange.id);
            if (node) setSelectedNode(node);
            return nds;
          });
        } else {
          setSelectedNode(null);
        }
      }
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        animated: true,
        style: { stroke: 'var(--text-muted)', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as const, width: 16, height: 16, color: 'var(--text-muted)' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...config } } : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...config } } : prev
      );
    },
    []
  );

  const handleSave = async () => {
    if (!workflow) return;
    setIsSaving(true);
    try {
      await api.put(
        `/api/workflows/${workflow.id}`,
        { definition: { nodes, edges } },
        token || undefined
      );
      toast.success('Workflow saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!workflow) return;
    setIsRunning(true);
    try {
      await api.post(`/api/workflows/${workflow.id}/run`, {}, token || undefined);
      toast.success('Workflow started!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  };

  if (!hasHydrated || !isAuthenticated || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ color: 'var(--brand-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading workflow...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!workflow) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Workflow not found</p>
            <button onClick={() => router.push('/workflows')} className="btn btn-primary">
              Back to Workflows
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/workflows')} className="btn btn-ghost px-2 py-1 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{workflow.name}</h1>
              {workflow.description && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{workflow.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRun} disabled={isRunning} className="btn btn-primary text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button onClick={handleSave} disabled={isSaving} className="btn btn-secondary text-sm flex items-center gap-1.5">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Node Palette */}
          <div className="w-56 border-r p-3 overflow-y-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
            <NodePalette />
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <WorkflowCanvas
                initialNodes={nodes}
                initialEdges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
              />
            </ReactFlowProvider>
          </div>

          {/* Right: Config Panel */}
          <div className="w-72 border-l overflow-y-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
            <NodeConfigPanel
              node={selectedNode}
              agents={agents}
              onUpdate={handleNodeUpdate}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
}
