import React from 'react';
import CodeEditor from './CodeEditor';
import { IconX } from './Icons';

interface FileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  content: string;
  setContent: (content: string) => void;
  onSave: () => void;
  language: string;
}

export const FileEditorModal: React.FC<FileEditorModalProps> = ({
  isOpen,
  onClose,
  filePath,
  content,
  setContent,
  onSave,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="w-full max-w-[800px] h-[600px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Sync Code Editor</h3>
            <span className="text-xs font-mono text-primary">{filePath}</span>
          </div>
          <button className="btn h-auto p-1.5 border-none bg-transparent hover:bg-slate-200" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-slate-50 p-2">
          <div className="h-full border border-slate-200 rounded-sm overflow-hidden bg-white">
            <CodeEditor
              value={content}
              onChange={setContent}
              onSave={onSave}
              language={language}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary px-6" onClick={onSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};
