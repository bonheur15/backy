import React from 'react';
import { Connection, Endpoint, DBModel, LogicBlock } from '../types';

interface ConnectionOverlayProps {
  connections: Connection[];
  endpoints: Endpoint[];
  dbModels: DBModel[];
  logicBlocks: LogicBlock[];
  activeConnStart: any;
  mousePos: { x: number; y: number };
  onDeleteConnection: (id: string) => void;
}

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = ({
  connections,
  endpoints,
  dbModels,
  logicBlocks,
  activeConnStart,
  mousePos,
  onDeleteConnection
}) => {
  const allNodes = [...endpoints, ...dbModels, ...logicBlocks];

  const renderPath = (x1: number, y1: number, x2: number, y2: number, type: 'input' | 'output' = 'output', id?: string) => {
    const cp1x = x1 + (type === 'output' ? Math.abs(x2 - x1) / 2 : -Math.abs(x2 - x1) / 2);
    const cp2x = x2 + (type === 'output' ? -Math.abs(x2 - x1) / 2 : Math.abs(x2 - x1) / 2);

    return (
      <path
        key={id || 'active'}
        d={`M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`}
        className={`connection-path ${!id ? 'selected stroke-dash-[5,5]' : ''}`}
        style={id ? { pointerEvents: 'auto', cursor: 'pointer' } : undefined}
        onClick={id ? (e) => { e.stopPropagation(); onDeleteConnection(id); } : undefined}
      />
    );
  };

  return (
    <svg 
      className="absolute left-[-10000px] top-[-10000px] w-[20000px] h-[20000px] overflow-visible pointer-events-none z-[5]"
    >
      <g transform="translate(10000, 10000)">
        {connections.map((conn) => {
          const fromNode = allNodes.find((n) => n.id === conn.fromNodeId);
          const toNode = allNodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          return renderPath(
            fromNode.position.x + 300,
            fromNode.position.y + 100,
            toNode.position.x,
            toNode.position.y + 100,
            'output',
            conn.id
          );
        })}

        {activeConnStart && renderPath(
          activeConnStart.x,
          activeConnStart.y,
          mousePos.x,
          mousePos.y,
          activeConnStart.type
        )}
      </g>
    </svg>
  );
};
