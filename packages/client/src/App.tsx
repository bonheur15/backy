import React, { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import { EndpointWizardModal, DBModelModal } from './components/Modal';
import Console from './components/Console';
import CodeEditor from './components/CodeEditor';
import type { Endpoint, DBModel, ProjectMetadata, LogicBlock, Connection } from './types';
import { LogicBlockModal } from './components/LogicBlockModal';
import VersionControl from './components/VersionControl';
import ProjectsDashboard from './components/ProjectsDashboard';
import { IconDesigner, IconGitBranch, IconBriefcase, IconFolder, IconFile, IconX, IconChevronDown, IconChevronRight } from './components/Icons';

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

export default function App() {
  // Canvas / Project State
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [dbModels, setDbModels] = useState<DBModel[]>([]);
  const [logicBlocks, setLogicBlocks] = useState<LogicBlock[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<'designer' | 'git' | 'projects' | 'library'>('designer');
  const [currentProjectName, setCurrentProjectName] = useState<string>('demo-project');
  const [gitAutoCommit, setGitAutoCommit] = useState<boolean>(false);

  // Global Favorites State
  const [favoriteBlocks, setFavoriteBlocks] = useState<LogicBlock[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('backy_favorites') || '[]');
    } catch { return []; }
  });

  // UI Selection states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals state
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isDBModelModalOpen, setIsDBModelModalOpen] = useState(false);
  const [isLogicBlockModalOpen, setIsLogicBlockModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
  const [editingDBModel, setEditingDBModel] = useState<DBModel | null>(null);
  const [editingLogicBlock, setEditingLogicBlock] = useState<LogicBlock | null>(null);

  // Modal positioning for new nodes
  const [newNodePos, setNewNodePos] = useState({ x: 100, y: 150 });

  // Console Logs & Server Status
  const [logs, setLogs] = useState<string>('');
  const [serverRunning, setServerRunning] = useState<boolean>(true);

  // Sidebar Code Sync Explorer State
  const [projectFiles, setProjectFiles] = useState<{ name: string; relativePath: string; isDir: boolean }[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [isFileViewerOpen, setIsFileViewerOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  // Command Palette State
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  // Fetch API Base URL
  const apiBase = window.location.port === '5173' ? 'http://localhost:3000' : '';

  // 1. Initial Load of Canvas data and files
  const loadProjectData = async () => {
    try {
      const res = await fetch(`${apiBase}/api/metadata`);
      const data: ProjectMetadata = await res.json();
      setEndpoints(data.endpoints || []);
      setDbModels(data.dbModels || []);
      setLogicBlocks(data.logicBlocks || []);
      setConnections(data.connections || []);
      setGitAutoCommit(!!data.gitAutoCommit);
      
      // Update files list in sidebar
      loadProjectFiles();
    } catch (e) {
      console.error('Error loading project metadata:', e);
    }
  };

  const loadProjectFiles = async () => {
    try {
      const res = await fetch(`${apiBase}/api/files`);
      const files = await res.json();
      setProjectFiles(files || []);
    } catch (e) {
      console.error('Error loading files:', e);
    }
  };

  const loadCurrentProjectName = async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects/current`);
      const data = await res.json();
      setCurrentProjectName(data.name);
    } catch (e) {
      console.error('Error loading current project name:', e);
    }
  };

  const handleProjectOpened = () => {
    setActiveTab('designer');
    loadProjectData();
    loadCurrentProjectName();
  };

  const handleToggleAutoCommit = (val: boolean) => {
    setGitAutoCommit(val);
    saveProjectState(endpoints, dbModels, logicBlocks, connections, val);
  };

  useEffect(() => {
    loadProjectData();
    loadCurrentProjectName();
    checkServerStatus();

    // Check server running status on an interval
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. WebSocket connection for logs
  useEffect(() => {
    const wsHost = window.location.port === '5173' ? 'localhost:3000' : window.location.host;
    const ws = new WebSocket(`ws://${wsHost}/ws/logs`);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') {
          setLogs((prev) => prev + payload.data);
        }
      } catch (e) {
        // Fallback for raw data
        setLogs((prev) => prev + event.data);
      }
    };

    ws.onclose = () => {
      console.log('WS connection closed. Reconnecting...');
    };

    return () => ws.close();
  }, []);

  // 3. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if writing in input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl + K / Cmd + K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(p => !p);
        setPaletteQuery('');
        setPaletteIndex(0);
      }

      // N / Ctrl + N -> New Endpoint Wizard
      if (e.key === 'n' || ((e.ctrlKey || e.metaKey) && e.key === 'n')) {
        e.preventDefault();
        triggerAddEndpoint(100, 150);
      }

      // D / Ctrl + D -> New DB Model
      if (e.key === 'd' || ((e.ctrlKey || e.metaKey) && e.key === 'd')) {
        e.preventDefault();
        triggerAddDBModel(400, 150);
      }

      // Escape -> Close everything
      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        setIsEndpointModalOpen(false);
        setIsDBModelModalOpen(false);
        setIsFileViewerOpen(false);
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/server/status`);
      const data = await res.json();
      setServerRunning(data.running);
    } catch (e) {
      setServerRunning(false);
    }
  };

  // 4. Save Canvas state to API
  const saveProjectState = async (eps: Endpoint[], models: DBModel[], blocks: LogicBlock[] = logicBlocks, conns: Connection[] = connections, autoCommit: boolean = gitAutoCommit) => {
    try {
      await fetch(`${apiBase}/api/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoints: eps,
          dbModels: models,
          logicBlocks: blocks,
          connections: conns,
          gitAutoCommit: autoCommit
        })
      });
      loadProjectFiles(); // Refresh directory outline
    } catch (e) {
      console.error('Error saving state:', e);
    }
  };

  // Server API actions
  const handleStartServer = async () => {
    await fetch(`${apiBase}/api/server/start`, { method: 'POST' });
    checkServerStatus();
  };

  const handleStopServer = async () => {
    await fetch(`${apiBase}/api/server/stop`, { method: 'POST' });
    checkServerStatus();
  };

  const handleRestartServer = async () => {
    await fetch(`${apiBase}/api/server/restart`, { method: 'POST' });
    checkServerStatus();
  };

  const handleDbPush = async (): Promise<string> => {
    const res = await fetch(`${apiBase}/api/server/db-push`, { method: 'POST' });
    const data = await res.json();
    return data.output;
  };

  const handleInstallPackages = async (packages: string[]): Promise<string> => {
    const res = await fetch(`${apiBase}/api/server/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packages })
    });
    const data = await res.json();
    return data.output;
  };

  // Node operations
  const triggerAddEndpoint = (x: number, y: number) => {
    setEditingEndpoint(null);
    setNewNodePos({ x, y });
    setIsEndpointModalOpen(true);
  };

  const triggerAddDBModel = (x: number, y: number) => {
    setEditingDBModel(null);
    setNewNodePos({ x, y });
    setIsDBModelModalOpen(true);
  };

  const triggerAddLogicBlock = (x: number, y: number) => {
    setEditingLogicBlock(null);
    setNewNodePos({ x, y });
    setIsLogicBlockModalOpen(true);
  };

  const handleSaveEndpoint = (ep: Endpoint) => {
    let updated: Endpoint[];
    if (editingEndpoint) {
      updated = endpoints.map(e => e.id === ep.id ? ep : e);
    } else {
      updated = [...endpoints, ep];
    }
    setEndpoints(updated);
    setIsEndpointModalOpen(false);
    saveProjectState(updated, dbModels, logicBlocks, connections);
  };

  const handleSaveDBModel = (model: DBModel) => {
    let updated: DBModel[];
    if (editingDBModel) {
      updated = dbModels.map(m => m.id === model.id ? model : m);
    } else {
      updated = [...dbModels, model];
    }
    setDbModels(updated);
    setIsDBModelModalOpen(false);
    saveProjectState(endpoints, updated, logicBlocks, connections);
  };

  const handleSaveLogicBlock = (block: LogicBlock) => {
    let updated: LogicBlock[];
    if (editingLogicBlock) {
      updated = logicBlocks.map(b => b.id === block.id ? block : b);
    } else {
      updated = [...logicBlocks, block];
    }
    setLogicBlocks(updated);
    setIsLogicBlockModalOpen(false);
    saveProjectState(endpoints, dbModels, updated, connections);

    // Save to global favorites if marked
    if (block.isFavorite) {
      setFavoriteBlocks(prev => {
        const favs = prev.filter(f => f.name !== block.name);
        const newFavs = [...favs, block];
        localStorage.setItem('backy_favorites', JSON.stringify(newFavs));
        return newFavs;
      });
    }
  };

  const handleAddConnection = (conn: Connection) => {
    const updated = [...connections, conn];
    setConnections(updated);
    saveProjectState(endpoints, dbModels, logicBlocks, updated);
  };

  const handleDeleteConnection = (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    setConnections(updated);
    saveProjectState(endpoints, dbModels, logicBlocks, updated);
  };

  const handleUpdateNodePosition = (id: string, type: 'endpoint' | 'dbModel' | 'logicBlock', x: number, y: number) => {
    if (type === 'endpoint') {
      const updated = endpoints.map(e => e.id === id ? { ...e, position: { x, y } } : e);
      setEndpoints(updated);
      saveProjectState(updated, dbModels, logicBlocks, connections);
    } else if (type === 'dbModel') {
      const updated = dbModels.map(m => m.id === id ? { ...m, position: { x, y } } : m);
      setDbModels(updated);
      saveProjectState(endpoints, updated, logicBlocks, connections);
    } else if (type === 'logicBlock') {
      const updated = logicBlocks.map(l => l.id === id ? { ...l, position: { x, y } } : l);
      setLogicBlocks(updated);
      saveProjectState(endpoints, dbModels, updated, connections);
    }
  };

  const handleDeleteNode = async (id: string, type: 'endpoint' | 'dbModel' | 'logicBlock') => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'endpoint') {
        const ep = endpoints.find(e => e.id === id);
        if (ep) {
          // Send delete request
          await fetch(`${apiBase}/api/endpoints/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name: ep.name, method: ep.method })
          });
          const updated = endpoints.filter(e => e.id !== id);
          setEndpoints(updated);
          setSelectedNodeId(null);
          saveProjectState(updated, dbModels, logicBlocks, connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
        }
      } else if (type === 'dbModel') {
        const updated = dbModels.filter(m => m.id !== id);
        setDbModels(updated);
        setSelectedNodeId(null);
        saveProjectState(endpoints, updated, logicBlocks, connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
      } else if (type === 'logicBlock') {
        const updated = logicBlocks.filter(b => b.id !== id);
        setLogicBlocks(updated);
        setSelectedNodeId(null);
        saveProjectState(endpoints, dbModels, updated, connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
      }
    }
  };

  const handleOpenEndpointLogic = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint);
    setIsEndpointModalOpen(true);
  };

  const handleOpenLogicBlockLogic = (block: LogicBlock) => {
    setEditingLogicBlock(block);
    setIsLogicBlockModalOpen(true);
  };

  // Sidebar file click
  const handleOpenFile = async (relPath: string) => {
    try {
      const res = await fetch(`${apiBase}/api/files/content?path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      setSelectedFilePath(relPath);
      setSelectedFileContent(data.content);
      setIsFileViewerOpen(true);
    } catch (e) {
      console.error('Error reading file:', e);
    }
  };

  const handleSaveFileContent = async () => {
    if (!selectedFilePath) return;
    try {
      await fetch(`${apiBase}/api/files/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFilePath,
          content: selectedFileContent
        })
      });
      setIsFileViewerOpen(false);
      // Wait a moment then reload metadata in case they edited models or paths in index.ts
      setTimeout(loadProjectData, 1000);
    } catch (e) {
      console.error('Error saving file content:', e);
    }
  };

  // Command Palette Items
  const paletteActions = [
    { label: 'Create New Endpoint Route', desc: 'Shortcut: N', action: () => triggerAddEndpoint(100, 150) },
    { label: 'Create New DB Table', desc: 'Shortcut: D', action: () => triggerAddDBModel(400, 150) },
    { label: 'Restart Backend Dev Server', desc: 'Bun Watcher Reset', action: handleRestartServer },
    { label: 'Run Drizzle Push (Schema Sync)', desc: 'Pushes migrations to SQLite', action: () => { handleDbPush(); } },
    { label: 'Clear Console logs', desc: 'Flushes display buffer', action: () => setLogs('') },
    { label: 'Re-sync Canvas and Files', desc: 'Full reload', action: loadProjectData }
  ];

  const filteredActions = paletteActions.filter(a =>
    a.label.toLowerCase().includes(paletteQuery.toLowerCase())
  );

  // Command Palette navigation key handler
  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteIndex(i => (i + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteIndex(i => (i - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[paletteIndex]) {
        filteredActions[paletteIndex].action();
        setIsPaletteOpen(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'var(--bg-main)' }}>
      
      {/* 1. Header / Navigation Ribbon */}
      <header
        className="glass-panel"
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: activeTab === 'designer' ? (isSidebarOpen ? 280 : 80) : 24, // Grow when sidebar is hidden
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10,
          background: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: '28px', height: '28px' }}>
            <rect width="100" height="100" rx="20" fill="var(--primary)" />
            <path d="M30 30h40v15H45v10h20v15H30V30z" fill="white" />
          </svg>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              BACKY
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500, fontFamily: 'var(--font-mono)', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                {currentProjectName}
              </span>
            </h1>
            <span style={{ fontSize: '10px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>v1.0 // bun runtime</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn ${activeTab === 'designer' ? 'btn-primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveTab('designer')}
          >
            <IconDesigner size={14} /> Designer
          </button>
          <button
            className={`btn ${activeTab === 'git' ? 'btn-primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveTab('git')}
          >
            <IconGitBranch size={14} /> Git Control
          </button>
          <button
            className={`btn ${activeTab === 'library' ? 'btn-primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveTab('library')}
          >
            ★ Library
          </button>
          <button
            className={`btn ${activeTab === 'projects' ? 'btn-primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setActiveTab('projects')}
          >
            <IconBriefcase size={14} /> Projects
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setIsPaletteOpen(true)}>
            <span style={{ border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginRight: '6px' }}>Ctrl K</span>
            Command Palette
          </button>
          {activeTab === 'designer' && (
            <button className="btn btn-primary" onClick={() => triggerAddEndpoint(100, 150)}>+ New Endpoint</button>
          )}
        </div>
      </header>

      {/* Tab Contents */}
      {activeTab === 'designer' && (
        <>
          {/* 2. File Explorer Sidebar */}
          <aside
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              bottom: 340, // height leaves space for bottom console
              width: isSidebarOpen ? '240px' : '48px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              padding: isSidebarOpen ? '16px' : '16px 0',
              alignItems: isSidebarOpen ? 'stretch' : 'center',
              background: 'var(--bg-surface)',
              transition: 'width 0.2s ease, padding 0.2s ease'
            }}
          >
            {isSidebarOpen ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>
                    Code Files
                  </h3>
                  <button className="btn" style={{ padding: '4px' }} onClick={() => setIsSidebarOpen(false)}>
                    <IconX size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {projectFiles.filter(file => {
                    if (!file.relativePath.includes('/')) return true;
                    const parts = file.relativePath.split('/');
                    parts.pop();
                    let current = '';
                    for (const p of parts) {
                      current += (current ? '/' : '') + p;
                      if (!expandedFolders.includes(current)) return false;
                    }
                    return true;
                  }).map((file) => {
                    // Calculate depth for indentation
                    const depth = file.relativePath.split('/').length - 1;
                    const isExpanded = expandedFolders.includes(file.relativePath);
                    return (
                      <div
                        key={file.relativePath}
                        onClick={() => {
                          if (file.isDir) {
                            setExpandedFolders(prev => 
                              prev.includes(file.relativePath) 
                                ? prev.filter(p => p !== file.relativePath)
                                : [...prev, file.relativePath]
                            );
                          } else {
                            handleOpenFile(file.relativePath);
                          }
                        }}
                        style={{
                          fontSize: '13px',
                          fontFamily: 'var(--font-mono)',
                          color: file.isDir ? 'var(--color-muted)' : 'var(--color-text)',
                          padding: `4px 8px 4px ${8 + depth * 14}px`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid transparent',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', opacity: file.isDir ? 0.7 : 1 }}>
                          {file.isDir ? (
                            isExpanded ? <IconChevronDown size={14} color="var(--color-muted)" /> : <IconChevronRight size={14} color="var(--color-muted)" />
                          ) : (
                            <span style={{ width: 14, display: 'inline-block' }}></span>
                          )}
                          <span style={{ marginLeft: 4, display: 'flex', alignItems: 'center' }}>
                            {file.isDir ? <IconFolder size={14} color="var(--color-muted)" /> : <IconFile size={14} color="var(--primary)" />}
                          </span>
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                  Files sync automatically.
                </div>
              </>
            ) : (
              <button 
                className="btn" 
                style={{ padding: '8px', width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent' }} 
                onClick={() => setIsSidebarOpen(true)}
                title="Open Project Code Files"
              >
                <IconFolder size={18} color="var(--primary)" />
              </button>
            )}
          </aside>

          <Canvas
            endpoints={endpoints}
            dbModels={dbModels}
            logicBlocks={logicBlocks}
            connections={connections}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => { setSelectedNodeId(id); }}
            onUpdateNodePosition={handleUpdateNodePosition}
            onAddEndpoint={triggerAddEndpoint}
            onAddDBModel={triggerAddDBModel}
            onAddLogicBlock={triggerAddLogicBlock}
            onDeleteNode={handleDeleteNode}
            onOpenEndpointLogic={handleOpenEndpointLogic}
            onOpenLogicBlockLogic={handleOpenLogicBlockLogic}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
          />

          {/* 4. Console Logs / Shell manager */}
          <Console
            logs={logs}
            onClearLogs={() => setLogs('')}
            serverRunning={serverRunning}
            onStartServer={handleStartServer}
            onStopServer={handleStopServer}
            onRestartServer={handleRestartServer}
            onDbPush={handleDbPush}
            onInstallPackages={handleInstallPackages}
          />
        </>
      )}

      {activeTab === 'git' && (
        <VersionControl
          apiBase={apiBase}
          gitAutoCommit={gitAutoCommit}
          onToggleAutoCommit={handleToggleAutoCommit}
          loadProjectFiles={loadProjectFiles}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectsDashboard
          apiBase={apiBase}
          onProjectOpened={handleProjectOpened}
        />
      )}

      {activeTab === 'library' && (
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px' }}>Global Logic Library</h2>
          <p style={{ color: 'var(--color-dim)', marginBottom: '32px' }}>Your favorited reusable Logic Blocks across all projects.</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {favoriteBlocks.length === 0 && (
              <div style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>No favorite blocks saved yet. Mark a block as favorite when creating or editing it!</div>
            )}
            {favoriteBlocks.map(block => (
              <div key={block.id} className="glass-panel" style={{ padding: '20px', width: '350px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent)' }}>{block.name}()</h3>
                  <span style={{ color: '#fbbf24' }}>★</span>
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--color-dim)' }}>
                  <strong>Inputs:</strong> {block.inputs.length > 0 ? block.inputs.map(i => i.name).join(', ') : 'None'}
                  <br />
                  <strong>Outputs:</strong> {block.outputs.length > 0 ? block.outputs.map(o => o.name).join(', ') : 'void'}
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: 'auto', background: 'var(--accent)' }}
                  onClick={() => {
                    // Add this to the current canvas project
                    const newBlock = { ...block, id: `block_${Date.now()}`, position: { x: 300, y: 150 } };
                    handleSaveLogicBlock(newBlock);
                    setActiveTab('designer');
                  }}
                >
                  + Add to Current Canvas
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Modals (Endpoint creator, Database schema) */}
      <EndpointWizardModal
        isOpen={isEndpointModalOpen}
        endpoint={editingEndpoint}
        onClose={() => setIsEndpointModalOpen(false)}
        onSave={handleSaveEndpoint}
        x={newNodePos.x}
        y={newNodePos.y}
      />

      <DBModelModal
        isOpen={isDBModelModalOpen}
        model={editingDBModel}
        onClose={() => setIsDBModelModalOpen(false)}
        onSave={handleSaveDBModel}
        onPushChanges={async () => {
          const output = await handleDbPush();
          alert(`Database Synchronized!\n\n${output}`);
        }}
        x={newNodePos.x}
        y={newNodePos.y}
      />

      <LogicBlockModal
        isOpen={isLogicBlockModalOpen}
        block={editingLogicBlock}
        onClose={() => setIsLogicBlockModalOpen(false)}
        onSave={handleSaveLogicBlock}
        x={newNodePos.x}
        y={newNodePos.y}
      />

      {/* 6. Raw File Code Editor Modal */}
      {isFileViewerOpen && selectedFilePath && (
        <div className="modal-backdrop" onClick={() => setIsFileViewerOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ width: '750px', height: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Sync Code Editor</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--primary)' }}>
                  {selectedFilePath}
                </span>
              </div>
              <button className="btn" onClick={() => setIsFileViewerOpen(false)}><IconX size={14} /></button>
            </div>

            <div style={{ flex: 1, minHeight: '320px' }}>
              <CodeEditor
                value={selectedFileContent}
                onChange={setSelectedFileContent}
                onSave={handleSaveFileContent}
                language={getLanguageFromPath(selectedFilePath)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn" onClick={() => setIsFileViewerOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveFileContent}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Command Palette Popup */}
      {isPaletteOpen && (
        <div className="modal-backdrop" onClick={() => setIsPaletteOpen(false)}>
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '15%',
              width: '500px',
              padding: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <input
              type="text"
              placeholder="Search actions..."
              className="input-field input-field-mono"
              value={paletteQuery}
              onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
              onKeyDown={handlePaletteKeyDown}
              autoFocus
              style={{ padding: '10px 14px', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredActions.map((action, idx) => (
                <div
                  key={idx}
                  onClick={() => { action.action(); setIsPaletteOpen(false); }}
                  onMouseEnter={() => setPaletteIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: paletteIndex === idx ? 'var(--primary-glow)' : 'transparent',
                    border: paletteIndex === idx ? '1px solid var(--primary)' : '1px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{action.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>{action.desc}</span>
                </div>
              ))}
              {filteredActions.length === 0 && (
                <div style={{ padding: '8px', color: 'var(--color-dim)', textAlign: 'center', fontSize: '13px' }}>
                  No commands matched
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <span>Use ↑ ↓ arrow keys and Enter to execute</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
