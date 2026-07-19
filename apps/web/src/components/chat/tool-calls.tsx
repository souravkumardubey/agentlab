'use client';

import { useState } from 'react';

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status?: 'success' | 'error' | 'running';
  durationMs?: number;
}

interface ToolCallsDisplayProps {
  toolCalls: ToolCall[];
}

export function ToolCallsDisplay({ toolCalls }: ToolCallsDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-inset)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </svg>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {toolCalls.length} tool {toolCalls.length === 1 ? 'call' : 'calls'}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {toolCalls.map((tc, i) => (
            <ToolCallItem key={i} toolCall={tc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallItem({ toolCall, index }: { toolCall: ToolCall; index: number }) {
  const [showResult, setShowResult] = useState(false);

  const statusColor =
    toolCall.status === 'error'
      ? 'var(--color-danger)'
      : toolCall.status === 'running'
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  const statusIcon =
    toolCall.status === 'error' ? (
      <circle cx="12" cy="12" r="10" />
    ) : toolCall.status === 'running' ? (
      <>
        <circle cx="12" cy="12" r="10" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
      </>
    ) : (
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    );

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Tool Header */}
      <button
        onClick={() => setShowResult(!showResult)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={statusColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={toolCall.status === 'running' ? 'animate-spin' : ''}
          >
            {statusIcon}
          </svg>
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
          >
            {toolCall.name}
          </span>
          {toolCall.durationMs !== undefined && (
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {toolCall.durationMs}ms
            </span>
          )}
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: showResult ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded Result */}
      {showResult && (
        <div
          className="px-3 pb-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {/* Arguments */}
          <div className="mt-2">
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Input
            </span>
            <pre
              className="mt-1 text-xs overflow-x-auto"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                background: 'var(--surface-inset)',
                padding: '8px',
                borderRadius: '6px',
                margin: 0,
              }}
            >
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result && (
            <div className="mt-2">
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Output
              </span>
              <pre
                className="mt-1 text-xs overflow-x-auto max-h-32"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: toolCall.status === 'error' ? 'var(--color-danger)' : 'var(--text-secondary)',
                  background: 'var(--surface-inset)',
                  padding: '8px',
                  borderRadius: '6px',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
