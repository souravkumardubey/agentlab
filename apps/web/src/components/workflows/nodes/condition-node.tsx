import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ConditionConfig {
  label?: string;
  condition?: string;
}

export function ConditionNode({ data }: NodeProps) {
  const config = (data as ConditionConfig) || {};
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[160px]"
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        borderColor: '#f59e0b',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#f59e0b', borderColor: 'white' }}
      />
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {config.label || 'Condition'}
        </span>
      </div>
      {config.condition && (
        <div className="text-xs font-mono px-2 py-1 rounded mt-1" style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}>
          {config.condition}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#22c55e', borderColor: 'white', top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: '#ef4444', borderColor: 'white', top: '70%' }}
      />
    </div>
  );
}
