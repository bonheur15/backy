import React from 'react';
import { IconDesigner, IconGitBranch, IconBriefcase, IconPlus } from './Icons';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentProjectName: string;
  onOpenPalette: () => void;
  onNewEndpoint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentProjectName,
  onOpenPalette,
  onNewEndpoint
}) => {
  return (
    <header className="glass-panel absolute top-6 left-6 right-6 h-[60px] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-7 h-7">
          <rect width="100" height="100" rx="20" className="fill-primary" />
          <path d="M30 30h40v15H45v10h20v15H30V30z" fill="white" />
        </svg>
        <div>
          <h1 className="text-lg font-extrabold tracking-wider text-primary flex items-center gap-2">
            BACKY
            <span className="text-xs text-slate-500 font-medium font-mono border-l border-slate-200 pl-2">
              {currentProjectName}
            </span>
          </h1>
          <span className="text-[10px] text-slate-400 font-mono">v1.0 // bun runtime</span>
        </div>
      </div>

      <nav className="flex gap-1.5">
        {[
          { id: 'designer', label: 'Designer', icon: <IconDesigner size={14} /> },
          { id: 'git', label: 'Git Control', icon: <IconGitBranch size={14} /> },
          { id: 'library', label: 'Library', icon: null },
          { id: 'projects', label: 'Projects', icon: <IconBriefcase size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : ''} px-3.5 py-1.5 h-auto`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex gap-2">
        <button className="btn" onClick={onOpenPalette}>
          <span className="border border-slate-200 px-1.5 py-0.5 rounded text-[10px] mr-1.5">Ctrl K</span>
          Command Palette
        </button>
        {activeTab === 'designer' && (
          <button className="btn btn-primary" onClick={onNewEndpoint}>
            <IconPlus size={14} /> New Endpoint
          </button>
        )}
      </div>
    </header>
  );
};
