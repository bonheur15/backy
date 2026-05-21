import React from 'react';
import { Endpoint } from '../types';
import { IconShield } from './Icons';

interface EndpointNodeProps {
  ep: Endpoint;
  isSelected: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onOpenLogic: () => void;
  onPortMouseDown: (e: React.MouseEvent, portName: string, type: 'input' | 'output', x: number, y: number) => void;
  onPortMouseUp: (e: React.MouseEvent, portName: string, type: 'input' | 'output') => void;
  getMethodColor: (method: string) => string;
}

export const EndpointNode: React.FC<EndpointNodeProps> = ({
  ep,
  isSelected,
  onDragStart,
  onOpenLogic,
  onPortMouseDown,
  onPortMouseUp,
  getMethodColor
}) => {
  const methodColor = getMethodColor(ep.method);

  return (
    <div
      className={`canvas-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: ep.position.x,
        top: ep.position.y,
        borderTop: `4px solid ${methodColor}`,
        pointerEvents: 'auto'
      }}
      onMouseDown={onDragStart}
    >
      <div className="node-header">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded font-mono"
            style={{ color: methodColor, background: `${methodColor}22` }}
          >
            {ep.method}
          </span>
          {ep.isAuthorized && <IconShield size={14} className="text-primary opacity-80" />}
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Elysia</span>
      </div>

      <div className="node-body">
        <div className="font-semibold text-[15px] text-slate-900 truncate">{ep.name}</div>
        <div className="font-mono text-primary text-[12px] truncate">{ep.path}</div>
        
        <div className="flex justify-end mt-2">
          <button
            className="btn h-[28px] px-2.5 text-[11px] hover:-translate-y-0"
            style={{ borderColor: methodColor, color: methodColor }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenLogic();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Edit Route
          </button>
        </div>
      </div>

      <div
        className="node-port -left-[6px] top-[100px]"
        onMouseDown={(e) => onPortMouseDown(e, 'in', 'input', ep.position.x, ep.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'in', 'input')}
      />
      <div
        className="node-port -right-[6px] top-[100px]"
        onMouseDown={(e) => onPortMouseDown(e, 'out', 'output', ep.position.x + 300, ep.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'out', 'output')}
      />
    </div>
  );
};
