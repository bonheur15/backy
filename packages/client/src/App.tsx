import React, { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import { EndpointWizardModal, DBModelModal } from './components/Modal';
import Console from './components/Console';
import type { Endpoint, DBModel, ProjectMetadata, LogicBlock, Connection } from './types';
import { LogicBlockModal } from './components/LogicBlockModal';
import VersionControl from './components/VersionControl';
import ProjectsDashboard from './components/ProjectsDashboard';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { FileEditorModal } from './components/FileEditorModal';

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: any = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', html: 'html', css: 'css', md: 'markdown' };
  return map[ext || ''] || 'plaintext';
};

export default function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [dbModels, setDbModels] = useState<DBModel[]>([]);
  const [logicBlocks, setLogicBlocks] = useState<LogicBlock[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<'designer' | 'git' | 'projects' | 'library'>('designer');
  const [currentProjectName, setCurrentProjectName] = useState<string>('demo-project');
  const [gitAutoCommit, setGitAutoCommit] = useState<boolean>(false);
  const [favoriteBlocks, setFavoriteBlocks] = useState<LogicBlock[]>(() => {
    try { return JSON.parse(localStorage.getItem('backy_favorites') || '[]'); } catch { return []; }
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isDBModelModalOpen, setIsDBModelModalOpen] = useState(false);
  const [isLogicBlockModalOpen, setIsLogicBlockModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
  const [editingDBModel, setEditingDBModel] = useState<DBModel | null>(null);
  const [editingLogicBlock, setEditingLogicBlock] = useState<LogicBlock | null>(null);
  const [newNodePos, setNewNodePos] = useState({ x: 100, y: 150 });

  const [logs, setLogs] = useState<string>('');
  const [serverRunning, setServerRunning] = useState<boolean>(true);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [isFileViewerOpen, setIsFileViewerOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  const apiBase = window.location.port === '5173' ? 'http://localhost:3000' : '';

  const loadProjectData = async () => {
    try {
      const res = await fetch(`${apiBase}/api/metadata`);
      const data: ProjectMetadata = await res.json();
      setEndpoints(data.endpoints || []);
      setDbModels(data.dbModels || []);
      setLogicBlocks(data.logicBlocks || []);
      setConnections(data.connections || []);
      setGitAutoCommit(!!data.gitAutoCommit);
      loadProjectFiles();
    } catch (e) { console.error(e); }
  };

  const loadProjectFiles = async () => {
    try {
      const res = await fetch(`${apiBase}/api/files`);
      const files = await res.json();
      setProjectFiles(files || []);
    } catch (e) { console.error(e); }
  };

  const loadCurrentProjectName = async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects/current`);
      const data = await res.json();
      setCurrentProjectName(data.name);
    } catch (e) { console.error(e); }
  };

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/server/status`);
      const data = await res.json();
      setServerRunning(data.running);
    } catch (e) { setServerRunning(false); }
  };

  useEffect(() => {
    loadProjectData();
    loadCurrentProjectName();
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const wsHost = window.location.port === '5173' ? 'localhost:3000' : window.location.host;
    const ws = new WebSocket(`ws://${wsHost}/ws/logs`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') setLogs((prev) => prev + payload.data);
      } catch (e) { setLogs((prev) => prev + event.data); }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsPaletteOpen(p => !p); setPaletteQuery(''); setPaletteIndex(0); }
      if (e.key === 'n' || ((e.ctrlKey || e.metaKey) && e.key === 'n')) { e.preventDefault(); triggerAddEndpoint(100, 150); }
      if (e.key === 'd' || ((e.ctrlKey || e.metaKey) && e.key === 'd')) { e.preventDefault(); triggerAddDBModel(400, 150); }
      if (e.key === 'Escape') { setIsPaletteOpen(false); setIsEndpointModalOpen(false); setIsDBModelModalOpen(false); setIsFileViewerOpen(false); setSelectedNodeId(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveProjectState = async (eps: Endpoint[], models: DBModel[], blocks: LogicBlock[] = logicBlocks, conns: Connection[] = connections, autoCommit: boolean = gitAutoCommit) => {
    try {
      await fetch(`${apiBase}/api/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints: eps, dbModels: models, logicBlocks: blocks, connections: conns, gitAutoCommit: autoCommit })
      });
      loadProjectFiles();
    } catch (e) { console.error(e); }
  };

  const handleDbPush = async (): Promise<string> => {
    const res = await fetch(`${apiBase}/api/server/db-push`, { method: 'POST' });
    const data = await res.json();
    return data.output;
  };

  const triggerAddEndpoint = (x: number, y: number) => { setEditingEndpoint(null); setNewNodePos({ x, y }); setIsEndpointModalOpen(true); };
  const triggerAddDBModel = (x: number, y: number) => { setEditingDBModel(null); setNewNodePos({ x, y }); setIsDBModelModalOpen(true); };
  const triggerAddLogicBlock = (x: number, y: number) => { setEditingLogicBlock(null); setNewNodePos({ x, y }); setIsLogicBlockModalOpen(true); };

  const handleSaveEndpoint = (ep: Endpoint) => {
    const updated = editingEndpoint ? endpoints.map(e => e.id === ep.id ? ep : e) : [...endpoints, ep];
    setEndpoints(updated);
    setIsEndpointModalOpen(false);
    saveProjectState(updated, dbModels, logicBlocks, connections);
  };

  const handleSaveDBModel = (model: DBModel) => {
    const updated = editingDBModel ? dbModels.map(m => m.id === model.id ? model : m) : [...dbModels, model];
    setDbModels(updated);
    setIsDBModelModalOpen(false);
    saveProjectState(endpoints, updated, logicBlocks, connections);
  };

  const handleSaveLogicBlock = (block: LogicBlock) => {
    const updated = editingLogicBlock ? logicBlocks.map(b => b.id === block.id ? block : b) : [...logicBlocks, block];
    setLogicBlocks(updated);
    setIsLogicBlockModalOpen(false);
    saveProjectState(endpoints, dbModels, updated, connections);
    if (block.isFavorite) {
      setFavoriteBlocks(prev => {
        const newFavs = [...prev.filter(f => f.name !== block.name), block];
        localStorage.setItem('backy_favorites', JSON.stringify(newFavs));
        return newFavs;
      });
    }
  };

  const handleDeleteNode = async (id: string, type: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    if (type === 'endpoint') {
      const ep = endpoints.find(e => e.id === id);
      if (ep) await fetch(`${apiBase}/api/endpoints/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: ep.name, method: ep.method }) });
      setEndpoints(endpoints.filter(e => e.id !== id));
    } else if (type === 'dbModel') setDbModels(dbModels.filter(m => m.id !== id));
    else if (type === 'logicBlock') setLogicBlocks(logicBlocks.filter(b => b.id !== id));
    setSelectedNodeId(null);
    saveProjectState(endpoints.filter(e => e.id !== id), dbModels.filter(m => m.id !== id), logicBlocks.filter(b => b.id !== id), connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
  };

  const handleOpenFile = async (path: string) => {
    try {
      const res = await fetch(`${apiBase}/api/files/content?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setSelectedFilePath(path);
      setSelectedFileContent(data.content);
      setIsFileViewerOpen(true);
    } catch (e) { console.error(e); }
  };

  const handleSaveFileContent = async () => {
    if (!selectedFilePath) return;
    try {
      await fetch(`${apiBase}/api/files/content`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: selectedFilePath, content: selectedFileContent }) });
      setIsFileViewerOpen(false);
      setTimeout(loadProjectData, 1000);
    } catch (e) { console.error(e); }
  };

  const paletteActions = [
    { label: 'Create New Endpoint Route', desc: 'Shortcut: N', action: () => triggerAddEndpoint(100, 150) },
    { label: 'Create New DB Table', desc: 'Shortcut: D', action: () => triggerAddDBModel(400, 150) },
    { label: 'Restart Backend Dev Server', desc: 'Bun Watcher Reset', action: async () => { await fetch(`${apiBase}/api/server/restart`, { method: 'POST' }); checkServerStatus(); } },
    { label: 'Run Drizzle Push', desc: 'Schema Sync', action: async () => { const out = await handleDbPush(); alert(out); } },
    { label: 'Clear Console logs', desc: 'Flush buffer', action: () => setLogs('') },
    { label: 'Re-sync Canvas and Files', desc: 'Full reload', action: loadProjectData }
  ];

  const filteredActions = paletteActions.filter(a => a.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  return (
    <div className="flex w-screen h-screen relative overflow-hidden bg-slate-50 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentProjectName={currentProjectName}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onNewEndpoint={() => triggerAddEndpoint(100, 150)}
      />

      {activeTab === 'designer' && (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            files={projectFiles}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            onOpenFile={handleOpenFile}
          />

          <Canvas
            endpoints={endpoints}
            dbModels={dbModels}
            logicBlocks={logicBlocks}
            connections={connections}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodePosition={(id, type, x, y) => {
              const update = (list: any[]) => list.map(item => item.id === id ? { ...item, position: { x, y } } : item);
              if (type === 'endpoint') { const up = update(endpoints); setEndpoints(up); saveProjectState(up, dbModels, logicBlocks, connections); }
              else if (type === 'dbModel') { const up = update(dbModels); setDbModels(up); saveProjectState(endpoints, up, logicBlocks, connections); }
              else if (type === 'logicBlock') { const up = update(logicBlocks); setLogicBlocks(up); saveProjectState(endpoints, dbModels, up, connections); }
            }}
            onAddEndpoint={triggerAddEndpoint}
            onAddDBModel={triggerAddDBModel}
            onAddLogicBlock={triggerAddLogicBlock}
            onDeleteNode={handleDeleteNode}
            onOpenEndpointLogic={(ep) => { setEditingEndpoint(ep); setIsEndpointModalOpen(true); }}
            onOpenLogicBlockLogic={(bl) => { setEditingLogicBlock(bl); setIsLogicBlockModalOpen(true); }}
            onAddConnection={(c) => { const up = [...connections, c]; setConnections(up); saveProjectState(endpoints, dbModels, logicBlocks, up); }}
            onDeleteConnection={(id) => { const up = connections.filter(c => c.id !== id); setConnections(up); saveProjectState(endpoints, dbModels, logicBlocks, up); }}
          />

          <Console
            logs={logs}
            onClearLogs={() => setLogs('')}
            serverRunning={serverRunning}
            onStartServer={async () => { await fetch(`${apiBase}/api/server/start`, { method: 'POST' }); checkServerStatus(); }}
            onStopServer={async () => { await fetch(`${apiBase}/api/server/stop`, { method: 'POST' }); checkServerStatus(); }}
            onRestartServer={async () => { await fetch(`${apiBase}/api/server/restart`, { method: 'POST' }); checkServerStatus(); }}
            onDbPush={handleDbPush}
            onInstallPackages={async (p) => { const res = await fetch(`${apiBase}/api/server/install`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packages: p }) }); const d = await res.json(); return d.output; }}
          />
        </>
      )}

      {activeTab === 'git' && <VersionControl apiBase={apiBase} gitAutoCommit={gitAutoCommit} onToggleAutoCommit={(v) => { setGitAutoCommit(v); saveProjectState(endpoints, dbModels, logicBlocks, connections, v); }} loadProjectFiles={loadProjectFiles} />}
      {activeTab === 'projects' && <ProjectsDashboard apiBase={apiBase} onProjectOpened={() => { setActiveTab('designer'); loadProjectData(); loadCurrentProjectName(); }} />}
      {activeTab === 'library' && (
        <div className="flex-1 p-10 overflow-y-auto mt-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Global Logic Library</h2>
          <p className="text-slate-500 mb-8">Favorited reusable Logic Blocks.</p>
          <div className="flex flex-wrap gap-6">
            {favoriteBlocks.length === 0 && <div className="text-slate-400 italic">No favorite blocks saved yet.</div>}
            {favoriteBlocks.map(block => (
              <div key={block.id} className="glass-panel p-5 w-[350px] flex flex-col gap-3 border-t-4 border-slate-400">
                <div className="flex justify-between items-center"><h3 className="text-lg font-semibold text-slate-700">{block.name}()</h3><span className="text-yellow-500">Star</span></div>
                <div className="text-[13px] text-slate-500">
                  <strong>Inputs:</strong> {block.inputs.length > 0 ? block.inputs.map(i => i.name).join(', ') : 'None'}<br />
                  <strong>Outputs:</strong> {block.outputs.length > 0 ? block.outputs.map(o => o.name).join(', ') : 'void'}
                </div>
                <button className="btn btn-primary mt-auto bg-slate-500 border-slate-500" onClick={() => { const nb = { ...block, id: `block_${Date.now()}`, position: { x: 300, y: 150 } }; handleSaveLogicBlock(nb); setActiveTab('designer'); }}>Add to Canvas</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EndpointWizardModal isOpen={isEndpointModalOpen} endpoint={editingEndpoint} onClose={() => setIsEndpointModalOpen(false)} onSave={handleSaveEndpoint} x={newNodePos.x} y={newNodePos.y} />
      <DBModelModal isOpen={isDBModelModalOpen} model={editingDBModel} onClose={() => setIsDBModelModalOpen(false)} onSave={handleSaveDBModel} onPushChanges={async () => { const out = await handleDbPush(); alert(out); }} x={newNodePos.x} y={newNodePos.y} />
      <LogicBlockModal isOpen={isLogicBlockModalOpen} block={editingLogicBlock} onClose={() => setIsLogicBlockModalOpen(false)} onSave={handleSaveLogicBlock} x={newNodePos.x} y={newNodePos.y} />
      <FileEditorModal isOpen={isFileViewerOpen} onClose={() => setIsFileViewerOpen(false)} filePath={selectedFilePath || ''} content={selectedFileContent} setContent={setSelectedFileContent} onSave={handleSaveFileContent} language={getLanguageFromPath(selectedFilePath || '')} />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} query={paletteQuery} setQuery={setPaletteQuery} index={paletteIndex} setIndex={setPaletteIndex} filteredActions={filteredActions} />
    </div>
  );
}
