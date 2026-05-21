import React, { useState, useEffect } from 'react';
import { IconFolder, IconPlus, IconTrash, IconCheck } from './Icons';

export default function ProjectsDashboard({ apiBase, onProjectOpened }: any) {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProjectName.trim() }) });
      setNewProjectName('');
      loadProjects();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleOpen = async (name: string) => {
    try {
      await fetch(`${apiBase}/api/projects/open`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      onProjectOpened();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto mt-20 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Dashboard</h2>
            <p className="text-slate-500 mt-1">Manage and switch between your backend applications.</p>
          </div>
          <div className="flex gap-2">
            <input type="text" className="input-field w-64 shadow-sm" placeholder="New project name..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <button className="btn btn-primary px-6 shadow-sm" onClick={handleCreate} disabled={loading || !newProjectName.trim()}>{loading ? 'Creating...' : <><IconPlus size={16} /> Create</>}</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div key={p.name} className={`glass-panel p-6 group relative cursor-pointer border-2 transition-all ${p.current ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:border-slate-300'}`} onClick={() => handleOpen(p.name)}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${p.current ? 'bg-blue-500 text-white shadow-blue-200 shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all'}`}>
                  <IconFolder size={24} />
                </div>
                {p.current && <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase rounded-full tracking-wider"><IconCheck size={10} /> Active</span>}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{p.name}</h3>
              <p className="text-[12px] text-slate-400 font-mono">Last modified: {new Date(p.mtime).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn btn-primary flex-1 h-9 text-xs font-bold" onClick={(e) => { e.stopPropagation(); handleOpen(p.name); }}>Open Project</button>
                {!p.current && <button className="btn btn-danger h-9 w-9 p-0" title="Delete Project"><IconTrash size={14} /></button>}
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-400 mb-4"><IconFolder size={32} /></div>
            <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
            <p className="text-slate-500">Create your first project to get started with Backy.</p>
          </div>
        )}
      </div>
    </div>
  );
}
