import { Handle, Position, type NodeProps } from '@xyflow/react';

interface LLMConfig {
  label?: string;
  prompt?: string;
  systemPrompt?: string;
  model?: string;
}

export function LLMNode({ data }: NodeProps) {
  const config = (data as LLMConfig) || {};
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[160px]"
      style={{
        background: 'var(--brand-softer)',
        borderColor: 'var(--brand-primary)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: 'var(--brand-primary)', borderColor: 'white' }}
      />
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {config.label || 'LLM'}
        </span>
      </div>
      {config.model && (
        <div className="text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--surface-inset)', color: 'var(--text-muted)' }}>
          {config.model}
        </div>
      )}
      {config.prompt && (
        <div className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {config.prompt}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full"
        style={{ background: 'var(--brand-primary)', borderColor: 'white' }}
      />
    </div>
  );
}
