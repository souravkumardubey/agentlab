'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count: { runs: number };
  createdAt: string;
}

export default function WorkflowsPage() {
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [runFeedback, setRunFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && workspaceId) {
      fetchWorkflows();
    }
  }, [hasHydrated, isAuthenticated, workspaceId]);

  const fetchWorkflows = async (showLoading = true) => {
    if (!workspaceId) return;
    if (showLoading) setIsLoading(true);
    try {
      const data = await api.get<Workflow[]>(`/api/workflows?workspaceId=${workspaceId}`, token || undefined);
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setIsCreating(true);
    setCreateError('');

    try {
      const result = await api.post<{ id: string }>('/api/workflows', {
        name: form.name,
        description: form.description,
        definition: {
          nodes: [
            { id: 'start-1', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
            { id: 'end-1', type: 'end', position: { x: 500, y: 200 }, data: { label: 'End' } },
          ],
          edges: [
            { id: 'e-start-end', source: 'start-1', target: 'end-1' },
          ],
        },
        workspaceId,
      }, token || undefined);

      setShowCreateModal(false);
      setForm({ name: '', description: '' });
      // Navigate to the editor for the new workflow
      router.push(`/workflows/${result.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (workflow: Workflow) => {
    router.push(`/workflows/${workflow.id}`);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkflow) return;

    setIsEditing(true);
    setEditError('');
    try {
      await api.put(`/api/workflows/${editingWorkflow.id}`, {
        name: form.name,
        description: form.description,
        definition: { nodes: [], edges: [] },
      }, token || undefined);

      setEditingWorkflow(null);
      setForm({ name: '', description: '' });
      fetchWorkflows();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update workflow');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setRunFeedback(null);
    try {
      await api.delete(`/api/workflows/${deleteTarget.id}`, token || undefined);
      setDeleteTarget(null);
      fetchWorkflows();
    } catch (err) {
      setRunFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete workflow' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRun = async (id: string) => {
    setRunFeedback(null);
    try {
      await api.post(`/api/workflows/${id}/run`, {}, token || undefined);
      setRunFeedback({ type: 'success', message: 'Workflow started.' });
      fetchWorkflows(false);
    } catch (err) {
      console.error('Failed to run workflow:', err);
      setRunFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to start workflow' });
    }
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Workflows</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Design and automate AI workflows</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Workflow
          </button>
        </div>

        {runFeedback && (
          <div
            className="p-3 rounded-xl text-sm mb-6"
            style={{
              background: runFeedback.type === 'success' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
              color: runFeedback.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              border: `1px solid ${runFeedback.type === 'success' ? 'var(--color-success)' : 'rgba(197, 48, 48, 0.2)'}`,
            }}
          >
            {runFeedback.message}
          </div>
        )}

        {/* Workflows Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: 'var(--surface-inset)' }} />
                  <div className="w-16 h-5 rounded-full" style={{ backgroundColor: 'var(--surface-inset)' }} />
                </div>
                <div className="w-32 h-5 rounded mb-2" style={{ backgroundColor: 'var(--surface-inset)' }} />
                <div className="w-48 h-4 rounded mb-4" style={{ backgroundColor: 'var(--surface-inset)' }} />
                <div className="flex gap-2">
                  <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: 'var(--surface-inset)' }} />
                  <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: 'var(--surface-inset)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--brand-soft)' }}>
              <svg className="w-10 h-10" style={{ color: 'var(--brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No workflows yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Create AI workflows to automate complex tasks</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="card card-hover p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-softer)' }}>
                    <svg className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <span className={workflow.isActive ? 'badge badge-success' : 'badge badge-muted'}>
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{workflow.name}</h3>
                {workflow.description && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{workflow.description}</p>
                )}
                <div className="flex items-center justify-between text-sm mb-4" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', color: 'var(--text-muted)' }}>
                  <span>{workflow._count.runs} runs</span>
                  <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRun(workflow.id)}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Run
                  </button>
                  <button onClick={() => openEditModal(workflow)} className="btn btn-ghost px-3" title="Edit workflow">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleteTarget(workflow)} className="btn btn-ghost px-3" title="Delete workflow" style={{ color: 'var(--color-danger)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Workflow</h2>
            </div>
            <form onSubmit={handleCreate} className="modal-body space-y-4">
              {createError && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full px-4 py-3"
                  placeholder="My Workflow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full px-4 py-3"
                  placeholder="What does this workflow do?"
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="btn btn-primary">
                  {isCreating ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingWorkflow && (
        <div className="modal-overlay" onClick={() => { setEditingWorkflow(null); setForm({ name: '', description: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Workflow</h2>
            </div>
            <form onSubmit={handleEdit} className="modal-body space-y-4">
              {editError && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full px-4 py-3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { setEditingWorkflow(null); setForm({ name: '', description: '' }); }} className="btn btn-ghost">
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Workflow"
        description={
          <>
            Delete <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</span>? This removes the workflow and its run history.
          </>
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
}
