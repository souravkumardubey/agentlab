import { Handle, Position, type NodeProps } from '@xyflow/react';

interface AgentConfig {
  label?: string;
  agentId?: string;
}

export function AgentNode({ data }: NodeProps) {
  const config = (data as AgentConfig) || {};
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[160px]"
      style={{
        background: 'rgba(168, 85, 247, 0.08)',
        borderColor: '#a855f7',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#a855f7', borderColor: 'white' }}
      />
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4" style={{ color: '#a855f7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {config.label || 'Agent'}
        </span>
      </div>
      {config.agentId ? (
        <div className="text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--surface-inset)', color: 'var(--text-muted)' }}>
          {config.agentId.slice(0, 8)}...
        </div>
      ) : (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No agent selected</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#a855f7', borderColor: 'white' }}
      />
    </div>
  );
}
