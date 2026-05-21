import React from 'react';

interface PaletteAction {
  label: string;
  desc: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  index: number;
  setIndex: (i: number | ((prev: number) => number)) => void;
  filteredActions: PaletteAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
  index,
  setIndex,
  filteredActions
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => (i + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (i - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[index]) {
        filteredActions[index].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="w-full max-w-[500px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col gap-3 p-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Search actions..."
          className="input-field input-field-mono h-11 px-4 text-base"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        
        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
          {filteredActions.map((action, idx) => (
            <div
              key={idx}
              onClick={() => {
                action.action();
                onClose();
              }}
              onMouseEnter={() => setIndex(idx)}
              className={`px-3 py-2 rounded-sm cursor-pointer flex justify-between items-center transition-all duration-100 border
                ${index === idx ? 'bg-blue-50 border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
            >
              <span className="text-[13px] font-semibold">{action.label}</span>
              <span className="text-[11px] text-slate-400 font-mono">{action.desc}</span>
            </div>
          ))}
          {filteredActions.length === 0 && (
            <div className="py-2 text-slate-400 text-center text-[13px]">No commands matched</div>
          )}
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 px-1">
          <span>Use arrow keys and Enter to execute</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
