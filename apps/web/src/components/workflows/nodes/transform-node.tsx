import { Handle, Position, type NodeProps } from '@xyflow/react';

interface TransformConfig {
  label?: string;
  transformType?: string;
  value?: string;
}

export function TransformNode({ data }: NodeProps) {
  const config = (data as TransformConfig) || {};
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[160px]"
      style={{
        background: 'rgba(20, 184, 166, 0.08)',
        borderColor: '#14b8a6',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#14b8a6', borderColor: 'white' }}
      />
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4" style={{ color: '#14b8a6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {config.label || 'Transform'}
        </span>
      </div>
      {config.transformType && (
        <div className="text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--surface-inset)', color: 'var(--text-muted)' }}>
          {config.transformType}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#14b8a6', borderColor: 'white' }}
      />
    </div>
  );
}
