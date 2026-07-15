import { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';

interface NodeConfigPanelProps {
  node: Node | null;
  agents: Array<{ id: string; name: string }>;
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void;
}

const MODEL_OPTIONS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-2.0-flash',
  'claude-3-5-sonnet',
  'llama-3.1-70b',
  'mixtral-8x7b',
];

export function NodeConfigPanel({ node, agents, onUpdate }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setConfig({
        label: (node.data as Record<string, unknown>)?.label as string || '',
        prompt: (node.data as Record<string, unknown>)?.prompt as string || '',
        systemPrompt: (node.data as Record<string, unknown>)?.systemPrompt as string || '',
        model: (node.data as Record<string, unknown>)?.model as string || 'gpt-4o-mini',
        agentId: (node.data as Record<string, unknown>)?.agentId as string || '',
        condition: (node.data as Record<string, unknown>)?.condition as string || '',
        transformType: (node.data as Record<string, unknown>)?.transformType as string || 'extract',
        value: (node.data as Record<string, unknown>)?.value as string || '',
        field: (node.data as Record<string, unknown>)?.field as string || '',
      });
    }
  }, [node?.id]);

  const handleSave = () => {
    if (node) {
      onUpdate(node.id, config);
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (!node) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
        <p className="text-sm">Select a node to configure</p>
      </div>
    );
  }

  const nodeType = node.type as string;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Configure: {config.label || nodeType}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-inset)', color: 'var(--text-muted)' }}>
          {nodeType}
        </span>
      </div>

      {/* Label - common to all */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => handleChange('label', e.target.value)}
          onBlur={handleSave}
          className="input w-full px-3 py-2 text-sm"
          placeholder="Node label"
        />
      </div>

      {/* LLM Config */}
      {nodeType === 'llm' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Model</label>
            <select
              value={config.model}
              onChange={(e) => handleChange('model', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
              rows={3}
              placeholder="You are a helpful assistant."
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Prompt Template</label>
            <textarea
              value={config.prompt}
              onChange={(e) => handleChange('prompt', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
              rows={3}
              placeholder="Summarize: {{input}}"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Use {'{{variableName}}'} to reference upstream outputs
            </p>
          </div>
        </>
      )}

      {/* Agent Config */}
      {nodeType === 'agent' && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Select Agent</label>
          <select
            value={config.agentId}
            onChange={(e) => handleChange('agentId', e.target.value)}
            onBlur={handleSave}
            className="input w-full px-3 py-2 text-sm"
          >
            <option value="">-- Choose an agent --</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Condition Config */}
      {nodeType === 'condition' && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Condition Expression</label>
          <textarea
            value={config.condition}
            onChange={(e) => handleChange('condition', e.target.value)}
            onBlur={handleSave}
            className="input w-full px-3 py-2 text-sm font-mono"
            rows={2}
            placeholder="status === 'completed'"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Supports: field === &apos;value&apos;, field !== &apos;value&apos;, field &gt; N, field &lt; N
          </p>
        </div>
      )}

      {/* Transform Config */}
      {nodeType === 'transform' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select
              value={config.transformType}
              onChange={(e) => handleChange('transformType', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
            >
              <option value="extract">Extract field</option>
              <option value="format">Format template</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {config.transformType === 'extract' ? 'Field to extract' : 'Template (e.g. Hello {{name}})'}
            </label>
            <input
              type="text"
              value={config.value}
              onChange={(e) => handleChange('value', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
              placeholder={config.transformType === 'extract' ? 'fieldName' : 'Hello {{name}}'}
            />
          </div>
        </>
      )}

      {/* Filter Config */}
      {nodeType === 'filter' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Field</label>
            <input
              type="text"
              value={config.field}
              onChange={(e) => handleChange('field', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
              placeholder="fieldName"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Expected Value</label>
            <input
              type="text"
              value={config.value}
              onChange={(e) => handleChange('value', e.target.value)}
              onBlur={handleSave}
              className="input w-full px-3 py-2 text-sm"
              placeholder="value"
            />
          </div>
        </>
      )}

      {/* Save button */}
      <button onClick={handleSave} className="btn btn-primary w-full text-sm">
        Apply Changes
      </button>
    </div>
  );
}
