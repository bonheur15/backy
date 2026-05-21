import React, { useState, useEffect } from 'react';
import { IconGitBranch, IconGitCommit, IconCheck, IconPlus, IconCloud, IconTrash, IconX } from './Icons';

export default function VersionControl({ apiBase, gitAutoCommit, onToggleAutoCommit, loadProjectFiles }: any) {
  const [gitStatus, setGitStatus] = useState<any>({ initialized: false, branch: '', staged: [], modified: [] });
  const [commitMsg, setCommitMsg] = useState('');
  const [remotes, setRemotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGitStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/git/status`);
      const data = await res.json();
      setGitStatus(data);
      if (data.initialized) {
        const rRes = await fetch(`${apiBase}/api/git/remotes`);
        const rData = await rRes.json();
        setRemotes(rData.remotes || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadGitStatus(); }, []);

  const handleAction = async (endpoint: string, body?: any) => {
    setLoading(true);
    try {
      await fetch(`${apiBase}/api/git/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (endpoint === 'commit') setCommitMsg('');
      loadGitStatus();
      loadProjectFiles();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!gitStatus.initialized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 animate-in fade-in duration-300">
        <div className="p-6 rounded-full bg-slate-100 text-slate-400 mb-6"><IconGitBranch size={48} /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Git not initialized</h2>
        <p className="text-slate-500 mb-8 text-center max-w-md">Initialize a repository to track changes, create branches, and deploy your project.</p>
        <button className="btn btn-primary px-8 h-11 text-base font-bold shadow-lg" onClick={() => handleAction('init')} disabled={loading}>Initialize Repository</button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-10 overflow-y-auto mt-20 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200"><IconGitBranch size={24} /></div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Version Control</h2>
              <p className="text-slate-500 text-sm font-mono flex items-center gap-2 mt-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Branch: <span className="text-slate-900 font-bold">{gitStatus.branch}</span></p>
            </div>
          </div>
          <label className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
            <div className="text-right"><div className="text-xs font-bold text-slate-900 uppercase">Auto Commit</div><div className="text-[10px] text-slate-500">Commit on every change</div></div>
            <input type="checkbox" className="w-5 h-5 rounded" checked={gitAutoCommit} onChange={(e) => onToggleAutoCommit(e.target.checked)} />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-panel overflow-hidden border-2 border-slate-100">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Changes</h3><div className="flex gap-1.5"><button className="btn h-7 px-2.5 text-[10px] font-bold" onClick={() => handleAction('stage-all')}>Stage All</button><button className="btn h-7 px-2.5 text-[10px] font-bold border-red-100 text-red-500" onClick={() => handleAction('unstage-all')}>Unstage All</button></div></div>
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[400px]">
                {gitStatus.modified.map((f: string) => (
                  <div key={f} className="px-5 py-3 flex items-center justify-between group hover:bg-slate-50/50">
                    <span className="text-[13px] font-mono text-slate-600 truncate mr-4">{f}</span>
                    <button className="btn h-7 px-2 text-[10px] opacity-0 group-hover:opacity-100 bg-white" onClick={() => handleAction('stage', { file: f })}>+ Stage</button>
                  </div>
                ))}
                {gitStatus.staged.map((f: string) => (
                  <div key={f} className="px-5 py-3 flex items-center justify-between bg-blue-50/20 group">
                    <span className="text-[13px] font-mono text-blue-600 font-semibold truncate mr-4 flex items-center gap-2"><IconCheck size={14} /> {f}</span>
                    <button className="btn h-7 px-2 text-[10px] opacity-0 group-hover:opacity-100 bg-white" onClick={() => handleAction('unstage', { file: f })}><IconX size={12} /> Unstage</button>
                  </div>
                ))}
                {gitStatus.modified.length === 0 && gitStatus.staged.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm italic font-medium">No changes detected. Workspace is clean.</div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 bg-slate-900 border-none shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Commit Changes</h3>
              <div className="flex flex-col gap-4">
                <textarea className="w-full bg-slate-800 border-slate-700 rounded-lg p-4 text-white font-mono text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 min-h-[100px]" placeholder="Summary of what you changed..." value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
                <button className="btn btn-primary h-11 text-base font-bold shadow-blue-500/20 shadow-lg" onClick={() => handleAction('commit', { message: commitMsg })} disabled={loading || !commitMsg || gitStatus.staged.length === 0}><IconGitCommit size={18} /> {loading ? 'Committing...' : 'Commit to Local'}</button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4"><h3 className="text-sm font-bold text-slate-900 uppercase">Remotes</h3><button className="btn h-8 w-8 p-0" title="Add Remote"><IconPlus size={16} /></button></div>
              <div className="flex flex-col gap-4">
                {remotes.map(r => (
                  <div key={r.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative group">
                    <div className="font-bold text-slate-900 text-sm mb-1">{r.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate mb-3">{r.pushUrl}</div>
                    <div className="flex gap-2">
                      <button className="btn bg-white h-8 flex-1 text-[11px] font-bold" onClick={() => handleAction('push', { remote: r.name })}><IconCloud size={12} /> Push</button>
                      <button className="btn bg-white h-8 flex-1 text-[11px] font-bold" onClick={() => handleAction('pull', { remote: r.name })}>Pull</button>
                      <button className="btn btn-danger bg-transparent h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAction('remotes/remove', { name: r.name })}><IconTrash size={12} /></button>
                    </div>
                  </div>
                ))}
                {remotes.length === 0 && <div className="py-8 text-center text-slate-400 text-xs italic">No remote repositories configured.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
