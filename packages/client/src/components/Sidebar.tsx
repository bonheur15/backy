import React from 'react';
import { IconX, IconChevronDown, IconChevronRight, IconFolder, IconFile } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  files: any[];
  expandedFolders: string[];
  setExpandedFolders: (folders: string[]) => void;
  onOpenFile: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  files,
  expandedFolders,
  setExpandedFolders,
  onOpenFile
}) => {
  const toggleFolder = (path: string) => {
    setExpandedFolders(
      expandedFolders.includes(path)
        ? expandedFolders.filter((p) => p !== path)
        : [...expandedFolders, path]
    );
  };

  if (!isOpen) {
    return (
      <button
        className="btn fixed top-24 right-6 w-12 h-12 p-0 rounded-md border-none bg-transparent flex items-center justify-center z-50 hover:bg-slate-100"
        onClick={() => setIsOpen(true)}
      >
        <IconFolder size={20} className="text-primary" />
      </button>
    );
  }

  return (
    <aside className="glass-panel fixed top-24 right-6 bottom-[340px] w-[240px] flex flex-col z-50 p-4 animate-in slide-in-from-right duration-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Code Files</h3>
        <button className="btn h-auto p-1 border-none bg-transparent hover:bg-slate-100" onClick={() => setIsOpen(false)}>
          <IconX size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {files.map((file) => {
          const depth = file.relativePath.split('/').length - 1;
          const isExpanded = expandedFolders.includes(file.relativePath);
          
          // Basic visibility filter
          if (file.relativePath.includes('/')) {
            const parts = file.relativePath.split('/');
            parts.pop();
            let current = '';
            for (const p of parts) {
              current += (current ? '/' : '') + p;
              if (!expandedFolders.includes(current)) return null;
            }
          }

          return (
            <div
              key={file.relativePath}
              onClick={() => (file.isDir ? toggleFolder(file.relativePath) : onOpenFile(file.relativePath))}
              className={`text-[13px] font-mono p-1 rounded-sm cursor-pointer flex items-center gap-1.5 transition-all
                ${file.isDir ? 'text-slate-600' : 'text-slate-900'}
                hover:bg-blue-50/50 hover:text-blue-600`}
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              <span className="flex items-center">
                {file.isDir ? (
                  isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className="ml-1">
                  {file.isDir ? <IconFolder size={14} className="text-slate-400" /> : <IconFile size={14} className="text-primary" />}
                </span>
              </span>
              <span className="truncate">{file.name}</span>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 mt-2.5">
        Files sync automatically.
      </div>
    </aside>
  );
};
