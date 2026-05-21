import React, { useState, useRef, useEffect } from 'react';

interface ConsoleProps {
  logs: string;
  onClearLogs: () => void;
  serverRunning: boolean;
  onStartServer: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
  onDbPush: () => Promise<string>;
  onInstallPackages: (packages: string[]) => Promise<string>;
}

export default function Console({
  logs,
  onClearLogs,
  serverRunning,
  onStartServer,
  onStopServer,
  onRestartServer,
  onDbPush,
  onInstallPackages
}: ConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [installInput, setInstallInput] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom on update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installInput.trim()) return;
    setIsInstalling(true);
    const pkgs = installInput.trim().split(/\s+/);
    await onInstallPackages(pkgs);
    setInstallInput('');
    setIsInstalling(false);
  };

  const handleDbPush = async () => {
    setIsMigrating(true);
    await onDbPush();
    setIsMigrating(false);
  };

  if (!isOpen) {
    return (
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          zIndex: 10,
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`status-indicator ${serverRunning ? 'active' : 'inactive'}`} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
            BACKEND: {serverRunning ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
        <button
          className="btn"
          style={{ padding: '4px 12px', fontSize: '12px' }}
          onClick={() => setIsOpen(true)}
        >
          Open Console ▲
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '320px',
        display: 'flex',
        flexDirection: 'column',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        zIndex: 10,
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-surface)'
      }}
    >
      {/* Console Controls / Header */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-indicator ${serverRunning ? 'active' : 'inactive'}`} />
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              Elysia Engine
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {serverRunning ? (
              <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onStopServer}>
                Stop
              </button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onStartServer}>
                Start
              </button>
            )}
            <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRestartServer}>
              Restart
            </button>
          </div>
        </div>

        {/* Database and package controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn"
            style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--secondary)' }}
            onClick={handleDbPush}
            disabled={isMigrating}
          >
            {isMigrating ? 'Syncing Drizzle...' : 'Drizzle Sync (db:push)'}
          </button>

          {/* Package Installer Form */}
          <form onSubmit={handleInstall} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Install packages (e.g. zod bcrypt)"
              className="input-field"
              style={{ padding: '6px 12px', fontSize: '12px', width: '220px' }}
              value={installInput}
              onChange={(e) => setInstallInput(e.target.value)}
              disabled={isInstalling}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing...' : 'Add Pkg'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onClearLogs}>
            Clear
          </button>
          <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setIsOpen(false)}>
            Minimize ▼
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.6',
          color: 'var(--color-text)',
          background: 'var(--bg-terminal)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {logs || 'No logs received yet. Start the backend server to see outputs.'}
        </pre>
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
