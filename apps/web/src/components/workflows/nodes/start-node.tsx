import { Handle, Position, type NodeProps } from '@xyflow/react';

export function StartNode({ data }: NodeProps) {
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[120px] text-center"
      style={{
        background: 'var(--color-success-soft)',
        borderColor: 'var(--color-success)',
      }}
    >
      <div className="font-semibold text-sm" style={{ color: 'var(--color-success)' }}>
        {(data as { label?: string }).label || 'Start'}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: 'var(--color-success)', borderColor: 'white' }}
      />
    </div>
  );
}
