import React from 'react';
import { DBModel } from '../types';

interface DBModelNodeProps {
  model: DBModel;
  isSelected: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onPortMouseDown: (e: React.MouseEvent, portName: string, type: 'input' | 'output', x: number, y: number) => void;
  onPortMouseUp: (e: React.MouseEvent, portName: string, type: 'input' | 'output') => void;
}

export const DBModelNode: React.FC<DBModelNodeProps> = ({
  model,
  isSelected,
  onDragStart,
  onPortMouseDown,
  onPortMouseUp
}) => {
  return (
    <div
      className={`canvas-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: model.position.x,
        top: model.position.y,
        borderTop: '4px solid var(--secondary)',
        pointerEvents: 'auto'
      }}
      onMouseDown={onDragStart}
    >
      <div className="node-header">
        <span className="text-[10px] font-bold uppercase text-secondary bg-secondary-glow px-1.5 py-0.5 rounded font-mono">sqlite</span>
        <span className="text-[11px] text-slate-400 font-mono">Drizzle Table</span>
      </div>

      <div className="node-body">
        <div className="font-semibold text-[15px] font-mono text-slate-900 truncate">{model.name}</div>
        <div className="flex flex-col gap-1 mt-2">
          {model.columns.slice(0, 3).map((c) => (
            <div key={c.name} className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-700">{c.name}</span>
              <span className="text-slate-400">{c.type}</span>
            </div>
          ))}
          {model.columns.length > 3 && (
            <div className="text-[10px] text-slate-400 text-center">+ {model.columns.length - 3} more columns</div>
          )}
        </div>
      </div>

      <div
        className="node-port -left-[6px] top-[100px] border-secondary"
        onMouseDown={(e) => onPortMouseDown(e, 'in', 'input', model.position.x, model.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'in', 'input')}
      />
      <div
        className="node-port -right-[6px] top-[100px] border-secondary"
        onMouseDown={(e) => onPortMouseDown(e, 'out', 'output', model.position.x + 300, model.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'out', 'output')}
      />
    </div>
  );
};
