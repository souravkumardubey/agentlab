import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FilterConfig {
  label?: string;
  field?: string;
  value?: string;
}

export function FilterNode({ data }: NodeProps) {
  const config = (data as FilterConfig) || {};
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[160px]"
      style={{
        background: 'rgba(249, 115, 22, 0.08)',
        borderColor: '#f97316',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#f97316', borderColor: 'white' }}
      />
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4" style={{ color: '#f97316' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {config.label || 'Filter'}
        </span>
      </div>
      {config.field && (
        <div className="text-xs font-mono px-2 py-1 rounded mt-1" style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}>
          {config.field} = {config.value || '?'}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#f97316', borderColor: 'white' }}
      />
    </div>
  );
}
