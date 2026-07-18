'use client';

import { useEffect, useState } from 'react';
import { logError, getUserFriendlyMessage } from '@/lib/error-logger';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  const [errorId, setErrorId] = useState<string>('');

  useEffect(() => {
    const id = logError(error, {
      source: 'route-error-boundary',
    });
    setErrorId(id);
  }, [error]);

  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      style={{ background: 'var(--surface-page)' }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-6"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--color-danger-soft)',
            border: '1px solid rgba(197, 48, 48, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}
        >
          Something went wrong
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '0 0 24px',
            lineHeight: 1.6,
          }}
        >
          {getUserFriendlyMessage(error)}
        </p>

        {/* Error ID */}
        {errorId && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '0 0 24px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Reference: {errorId}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-secondary"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
