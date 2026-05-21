import React, { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconChevronRight, IconTrash } from './Icons';

export default function Console({ logs, onClearLogs, serverRunning, onStartServer, onStopServer, onRestartServer, onDbPush, onInstallPackages }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
  const [pkgInput, setPkgInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, isOpen]);

  const handleInstall = async () => {
    if (!pkgInput.trim()) return;
    const pkgs = pkgInput.split(',').map(p => p.trim());
    await onInstallPackages(pkgs);
    setPkgInput('');
  };

  return (
    <div className={`fixed bottom-6 left-6 right-6 glass-panel transition-all duration-300 z-50 flex flex-col overflow-hidden ${isOpen ? 'h-[300px]' : 'h-[48px]'}`}>
      <div className="flex items-center justify-between px-4 h-[48px] border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500 hover:text-primary transition-colors" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />} Terminal
          </button>
          {isOpen && (
            <div className="flex gap-1">
              {['logs', 'packages', 'actions'].map(t => (
                <button key={t} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${activeTab === t ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'}`} onClick={() => setActiveTab(t)}>{t}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-slate-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase text-slate-500">{serverRunning ? 'Live' : 'Offline'}</span>
          </div>
          {isOpen && (
            <div className="flex gap-1.5">
              <button className="btn h-7 px-2 text-[10px]" onClick={onRestartServer}>Restart</button>
              <button className="btn h-7 px-2 text-[10px] border-red-200 text-red-500" onClick={serverRunning ? onStopServer : onStartServer}>{serverRunning ? 'Stop' : 'Start'}</button>
              <button className="btn h-7 px-2 text-[10px] text-slate-400 border-none bg-transparent hover:bg-slate-200" onClick={onClearLogs}><IconTrash size={12} /></button>
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="flex-1 overflow-hidden bg-slate-900 font-mono text-[12px] p-4 text-slate-300">
          {activeTab === 'logs' && (
            <div className="h-full overflow-y-auto whitespace-pre-wrap break-all pr-2 scrollbar-thin scrollbar-thumb-slate-700">
              {logs || 'No system logs yet...'}
              <div ref={endRef} />
            </div>
          )}
          {activeTab === 'packages' && (
            <div className="flex flex-col gap-4 max-w-lg">
              <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Install dependencies</label><div className="flex gap-2"><input type="text" className="input-field bg-slate-800 border-slate-700 text-white h-9" placeholder="e.g. lodash, zod, uuid" value={pkgInput} onChange={e => setPkgInput(e.target.value)} /><button className="btn btn-primary h-9 px-4" onClick={handleInstall}>Install</button></div><span className="text-[10px] text-slate-500 italic">Separate multiple packages with commas.</span></div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50 text-[11px] text-slate-400">Backy uses **Bun** internally. Installed packages are automatically available in your logic blocks.</div>
            </div>
          )}
          {activeTab === 'actions' && (
            <div className="grid grid-cols-2 gap-3 max-w-xl">
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex flex-col gap-2"><h4 className="text-[11px] font-bold text-slate-400 uppercase">Database Tools</h4><button className="btn bg-slate-700 border-slate-600 text-white h-8 text-[11px] hover:bg-slate-600" onClick={onDbPush}>Force Drizzle Sync</button></div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex flex-col gap-2"><h4 className="text-[11px] font-bold text-slate-400 uppercase">Project Utilities</h4><button className="btn bg-slate-700 border-slate-600 text-white h-8 text-[11px] hover:bg-slate-600" onClick={() => window.location.reload()}>Hard Reset UI</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
