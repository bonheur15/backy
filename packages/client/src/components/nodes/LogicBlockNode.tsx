import React from 'react';
import { LogicBlock } from '../types';

interface LogicBlockNodeProps {
  block: LogicBlock;
  isSelected: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onOpenLogic: () => void;
  onPortMouseDown: (e: React.MouseEvent, portName: string, type: 'input' | 'output', x: number, y: number) => void;
  onPortMouseUp: (e: React.MouseEvent, portName: string, type: 'input' | 'output') => void;
}

export const LogicBlockNode: React.FC<LogicBlockNodeProps> = ({
  block,
  isSelected,
  onDragStart,
  onOpenLogic,
  onPortMouseDown,
  onPortMouseUp
}) => {
  return (
    <div
      className={`canvas-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: block.position.x,
        top: block.position.y,
        borderTop: '4px solid var(--accent)',
        pointerEvents: 'auto'
      }}
      onMouseDown={onDragStart}
    >
      <div className="node-header">
        <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">fn</span>
        <span className="text-[11px] text-slate-400 font-mono">Logic Block</span>
      </div>

      <div className="node-body">
        <div className="font-semibold text-[15px] font-mono text-slate-900 truncate">{block.name}()</div>
        <div className="flex justify-end mt-2">
          <button
            className="btn h-[28px] px-2.5 text-[11px] border-slate-400 text-slate-500 hover:-translate-y-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLogic();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Edit Logic
          </button>
        </div>
      </div>

      <div
        className="node-port -left-[6px] top-[100px] border-slate-400"
        onMouseDown={(e) => onPortMouseDown(e, 'in', 'input', block.position.x, block.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'in', 'input')}
      />
      <div
        className="node-port -right-[6px] top-[100px] border-slate-400"
        onMouseDown={(e) => onPortMouseDown(e, 'out', 'output', block.position.x + 300, block.position.y + 100)}
        onMouseUp={(e) => onPortMouseUp(e, 'out', 'output')}
      />
    </div>
  );
};
