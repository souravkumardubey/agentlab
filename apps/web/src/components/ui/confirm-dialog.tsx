'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  const iconStyle = tone === 'danger'
    ? { background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }
    : { background: 'var(--brand-soft)', color: 'var(--brand-primary)' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={iconStyle}>
            <AlertTriangle className="w-7 h-7" strokeWidth={1.6} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <div className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{description}</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-ghost flex-1">
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`btn flex-1 ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            >
              {isLoading ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}