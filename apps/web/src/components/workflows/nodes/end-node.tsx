import { Handle, Position, type NodeProps } from '@xyflow/react';

export function EndNode({ data }: NodeProps) {
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[120px] text-center"
      style={{
        background: 'var(--color-danger-soft)',
        borderColor: 'var(--color-danger)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: 'var(--color-danger)', borderColor: 'white' }}
      />
      <div className="font-semibold text-sm" style={{ color: 'var(--color-danger)' }}>
        {(data as { label?: string }).label || 'End'}
      </div>
    </div>
  );
}
