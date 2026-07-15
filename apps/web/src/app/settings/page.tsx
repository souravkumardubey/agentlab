'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface WorkspaceMember {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null };
}

type Tab = 'api-keys' | 'password' | 'members';

const tabs = [
  { key: 'api-keys' as Tab, label: 'API Keys', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  )},
  { key: 'password' as Tab, label: 'Password', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )},
  { key: 'members' as Tab, label: 'Members', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )},
];

export default function SettingsPage() {
  const { isAuthenticated, hasHydrated, token, user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('api-keys');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push('/login');
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div style={{ background: 'var(--surface-page)' }} className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your account and workspace settings</p>
        </div>

        <div className="flex gap-1 p-1 card mb-8 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'api-keys' && <ApiKeySection token={token} />}
        {activeTab === 'password' && <PasswordSection token={token} />}
        {activeTab === 'members' && <MembersSection token={token} workspaceId={workspaceId} currentUserId={user?.id} />}
      </div>
    </DashboardLayout>
  );
}

function ApiKeySection({ token }: { token: string | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchKeys = async () => {
    try {
      const data = await api.get<ApiKey[]>('/api/auth/api-keys', token || undefined);
      setKeys(data);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const data = await api.post<ApiKey>('/api/auth/api-keys', {
        name: newKeyName,
        expiresAt: newKeyExpiry || undefined,
      }, token || undefined);
      setCreatedKey(data.key);
      setNewKeyName('');
      setNewKeyExpiry('');
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/auth/api-keys/${deleteTarget.id}`, token || undefined);
      toast.success('API key deleted successfully');
      setDeleteTarget(null);
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete key');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>API Keys</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your API keys for external access</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Key
        </button>
      </div>

      {createdKey && (
        <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--color-success-soft)', border: '1px solid var(--color-success)' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-success)' }}>Key created. Copy it now — it won&apos;t be shown again.</p>
              <code className="block p-3 rounded-lg text-sm font-mono break-all card-inset" style={{ color: 'var(--text-primary)' }}>{createdKey}</code>
            </div>
          </div>
        </div>
      )}

      {showCreate && !createdKey && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API Key"
              className="input w-full px-4 py-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Expiry (optional)</label>
            <input
              type="datetime-local"
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(e.target.value)}
              className="input w-full px-4 py-3"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isCreating} className="btn btn-primary">
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="card p-8 text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : keys.length === 0 ? (
        <div className="card p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>No API keys yet</p>
        </div>
      ) : (
        <div className="card">
          {keys.map((key, index) => (
            <div
              key={key.id}
              className="px-6 py-4 flex items-center justify-between"
              style={index < keys.length - 1 ? { borderTop: '1px solid var(--border-default)' } : undefined}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{key.name}</p>
                  <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{key.key}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(key)} className="btn btn-danger text-sm">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete API Key"
        description={
          <>
            Delete <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</span>? Requests using this key will stop working.
          </>
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PasswordSection({ token }: { token: string | null }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword }, token || undefined);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-6 max-w-md">
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Update your password to keep your account secure</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input w-full px-4 py-3"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input w-full px-4 py-3"
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input w-full px-4 py-3"
            minLength={8}
            required
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

function MembersSection({ token, workspaceId, currentUserId }: { token: string | null; workspaceId: string | null; currentUserId?: string }) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('USER');
  const [isAdding, setIsAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchMembers = async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`, token || undefined);
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [workspaceId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setIsAdding(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/members`, { email: addEmail, role: addRole }, token || undefined);
      toast.success('Member added successfully');
      setAddEmail('');
      setAddRole('USER');
      setShowAdd(false);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!workspaceId || !removeTarget) return;

    setIsRemoving(true);
    try {
      await api.delete(`/api/workspaces/${workspaceId}/members/${removeTarget.id}`, token || undefined);
      toast.success('Member removed successfully');
      setRemoveTarget(null);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'badge badge-brand',
    USER: 'badge badge-success',
    VIEWER: 'badge badge-muted',
  };

  const isCurrentUserAdmin = members.some(m => m.user.id === currentUserId && m.role === 'ADMIN');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Members</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage who has access to this workspace</p>
        </div>
        {isCurrentUserAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Member
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="input w-full px-4 py-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="input w-full px-4 py-3"
            >
              <option value="USER">User</option>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isAdding} className="btn btn-primary">
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="card p-8 text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : members.length === 0 ? (
        <div className="card p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>No members found</p>
        </div>
      ) : (
        <div className="card">
          {members.map((m, index) => (
            <div
              key={m.id}
              className="px-6 py-4 flex items-center justify-between"
              style={index < members.length - 1 ? { borderTop: '1px solid var(--border-default)' } : undefined}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
                    {m.user.name?.[0] || m.user.email[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.user.name || m.user.email}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={roleColors[m.role] || 'badge badge-muted'}>{m.role}</span>
                {isCurrentUserAdmin && m.user.id !== currentUserId && (
                  <button onClick={() => setRemoveTarget(m)} className="btn btn-danger text-sm">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove Member"
        description={
          <>
            Remove <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{removeTarget?.user.name || removeTarget?.user.email}</span> from this workspace?
          </>
        }
        confirmLabel="Remove"
        isLoading={isRemoving}
        onConfirm={handleRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}
