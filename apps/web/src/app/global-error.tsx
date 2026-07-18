'use client';

import { useEffect, useState } from 'react';
import { logError, getUserFriendlyMessage } from '@/lib/error-logger';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [errorId, setErrorId] = useState<string>('');

  useEffect(() => {
    const id = logError(error, {
      source: 'global-error-boundary',
    });
    setErrorId(id);
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5EDE0',
          fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        }}
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
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              borderRadius: '16px',
              background: 'rgba(197, 48, 48, 0.08)',
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
              stroke="#C53030"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#2C2A25',
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '14px',
              color: '#6B6560',
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
                color: '#9C9589',
                margin: '0 0 24px',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              Reference: {errorId}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                borderRadius: '14px',
                border: '1px solid transparent',
                cursor: 'pointer',
                background: '#D36C0E',
                color: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(44, 42, 37, 0.08), 0 4px 14px rgba(211, 108, 14, 0.25)',
              }}
            >
              Try Again
            </button>
            <button
              onClick={handleReload}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                borderRadius: '14px',
                border: '1px solid #D6CFC3',
                cursor: 'pointer',
                background: '#FFFFFF',
                color: '#2C2A25',
                boxShadow: '0 1px 2px rgba(44, 42, 37, 0.05)',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
