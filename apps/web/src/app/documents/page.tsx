'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';

interface Document {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export default function DocumentsPage() {
  const { isAuthenticated, hasHydrated, token } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && workspaceId) {
      fetchDocuments();
    }
  }, [hasHydrated, isAuthenticated, workspaceId]);

  // Auto-refresh for processing documents
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !workspaceId) return;

    const hasProcessingDocs = documents.some(d => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasHydrated, isAuthenticated, workspaceId, documents]);

  const fetchDocuments = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const data = await api.get<Document[]>(`/api/documents?workspaceId=${workspaceId}`, token || undefined);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file || !workspaceId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);

      await api.upload('/api/documents/upload', formData, token || undefined);
      toast.success('Document uploaded successfully');
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/documents/${deleteTarget.id}`, token || undefined);
      toast.success('Document deleted successfully');
      setDeleteTarget(null);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { class: 'badge badge-success', label: 'Ready' };
      case 'PROCESSING': return { class: 'badge badge-warning', label: 'Processing' };
      case 'FAILED': return { class: 'badge badge-danger', label: 'Failed' };
      default: return { class: 'badge badge-muted', label: 'Pending' };
    }
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Documents</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Upload and manage documents for RAG-powered chat</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              className="hidden"
              accept=".txt,.pdf,.md,.csv,.json"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn btn-primary flex items-center gap-2"
            >
              {isUploading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              )}
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>

        {/* Upload Zone / Documents */}
        {isLoading ? (
          <div className="card p-12">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--surface-inset)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="w-48 h-4 rounded" style={{ background: 'var(--surface-inset)' }} />
                    <div className="w-32 h-3 rounded" style={{ background: 'var(--surface-inset)' }} />
                  </div>
                  <div className="w-20 h-5 rounded-full" style={{ background: 'var(--surface-inset)' }} />
                </div>
              ))}
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div
            className={`card p-12 text-center transition-all duration-300`}
            style={{
              borderColor: isDragging ? 'var(--brand-primary)' : undefined,
              borderWidth: isDragging ? '2px' : undefined,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--surface-inset)' }}>
              <svg className="w-10 h-10" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No documents yet</h3>
            <p className="mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Upload documents to enable RAG-powered chat with your data
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
              >
                Upload your first document
              </button>
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Supports .txt, .pdf, .md, .csv, .json</p>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              className="card p-4 mb-6 text-center transition-all duration-300 cursor-pointer"
              style={{
                borderStyle: 'dashed',
                borderColor: isDragging ? 'var(--brand-primary)' : undefined,
                borderWidth: isDragging ? '2px' : undefined,
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isDragging ? 'Drop file here...' : 'Drag & drop a file or click to upload'}
              </p>
            </div>

            {/* Documents Table */}
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Size</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Chunks</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Uploaded</th>
                    <th className="text-right px-6 py-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const statusConfig = getStatusConfig(doc.status);
                    return (
                      <tr
                        key={doc.id}
                        className="transition-colors"
                        style={{
                          borderBottom: '1px solid var(--border-default)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-inset)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-inset)' }}>
                              <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.mimeType || 'Unknown type'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatFileSize(doc.size)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {doc.chunkCount}
                        </td>
                        <td className="px-6 py-4">
                          <span className={statusConfig.class}>{statusConfig.label}</span>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Document"
        description={
          <>
            Delete <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</span>? This removes the document and its indexed chunks.
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
