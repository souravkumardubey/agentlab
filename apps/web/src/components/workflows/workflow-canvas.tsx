import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  addEdge,
  useReactFlow,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode } from './nodes/start-node';
import { EndNode } from './nodes/end-node';
import { LLMNode } from './nodes/llm-node';
import { AgentNode } from './nodes/agent-node';
import { ConditionNode } from './nodes/condition-node';
import { TransformNode } from './nodes/transform-node';
import { FilterNode } from './nodes/filter-node';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  agent: AgentNode,
  condition: ConditionNode,
  transform: TransformNode,
  filter: FilterNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: 'var(--text-muted)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--text-muted)' },
};

let nodeIdCounter = 0;
function getNodeId() {
  return `node-${Date.now()}-${nodeIdCounter++}`;
}

interface WorkflowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
}

export function WorkflowCanvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const labelMap: Record<string, string> = {
        start: 'Start',
        end: 'End',
        llm: 'LLM',
        agent: 'Agent',
        condition: 'Condition',
        transform: 'Transform',
        filter: 'Filter',
      };

      const newNode: Node = {
        id: getNodeId(),
        type,
        position,
        data: { label: labelMap[type] || type },
      };

      onNodesChange([{ type: 'add', item: newNode }]);
    },
    [screenToFlowPosition, onNodesChange]
  );

  const defaultConnect: OnConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={defaultConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-[var(--surface-page)]"
      >
        <Controls className="!rounded-xl !shadow-lg" />
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="var(--border-default)" />
      </ReactFlow>
    </div>
  );
}
