import React, { useState, useEffect } from 'react';
import { IconGitCommit, IconCloud, IconCheck, IconChevronDown, IconChevronRight } from './Icons';

interface GitFile {
  path: string;
  status: string; // e.g. "??", " M", "M ", "A ", " D", "D "
  name: string;
}

interface Commit {
  sha: string;
  parents: string[];
  refs: string[];
  author: string;
  date: string;
  subject: string;
}

interface Remote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

interface VersionControlProps {
  apiBase: string;
  gitAutoCommit: boolean;
  onToggleAutoCommit: (val: boolean) => void;
  loadProjectFiles: () => void;
}

const LANE_COLORS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#16a34a', // Green
  '#ea580c', // Orange
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#06b6d4', // Cyan
  '#eab308', // Yellow
];

export default function VersionControl({
  apiBase,
  gitAutoCommit,
  onToggleAutoCommit,
  loadProjectFiles
}: VersionControlProps) {
  // Git Repo State
  const [gitInitialized, setGitInitialized] = useState(false);
  const [changedFiles, setChangedFiles] = useState<GitFile[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState('');
  const [remotes, setRemotes] = useState<Remote[]>([]);

  // UI States
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [selectedRemote, setSelectedRemote] = useState('origin');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [selectedDiffFile, setSelectedDiffFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [fileDiff, setFileDiff] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [gitOutput, setGitOutput] = useState('');

  // Expandable sections
  const [showRemotes, setShowRemotes] = useState(false);
  const [showBranchCreator, setShowBranchCreator] = useState(false);

  useEffect(() => {
    loadGitStatus();
  }, []);

  const loadGitStatus = async () => {
    try {
      const statusRes = await fetch(`${apiBase}/api/git/status`);
      const statusData = await statusRes.json();
      setGitInitialized(statusData.initialized);
      
      if (statusData.initialized) {
        setChangedFiles(statusData.files || []);
        
        // Load branches
        const branchRes = await fetch(`${apiBase}/api/git/branches`);
        const branchData = await branchRes.json();
        setBranches(branchData.branches || []);
        setActiveBranch(branchData.activeBranch || '');
        if (branchData.activeBranch) {
          setSelectedBranch(branchData.activeBranch);
        }

        // Load log commits
        const logRes = await fetch(`${apiBase}/api/git/log`);
        const logData = await logRes.json();
        setCommits(logData.commits || []);

        // Load remotes
        const remotesRes = await fetch(`${apiBase}/api/git/remotes`);
        const remotesData = await remotesRes.json();
        setRemotes(remotesData.remotes || []);
        if (remotesData.remotes.length > 0) {
          setSelectedRemote(remotesData.remotes[0].name);
        }
      }
    } catch (e) {
      console.error('Error loading git status:', e);
    }
  };

  const handleInitializeRepo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/git/init`, { method: 'POST' });
      if (res.ok) {
        setGitOutput('Initialized empty Git repository.');
        await loadGitStatus();
      } else {
        const data = await res.json();
        setGitOutput(`Error initializing Git: ${data.error}`);
      }
    } catch (e: any) {
      setGitOutput(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageFile = async (path: string) => {
    try {
      await fetch(`${apiBase}/api/git/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      loadGitStatus();
      if (selectedDiffFile?.path === path) {
        setSelectedDiffFile({ path, staged: true });
        loadDiff(path, true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnstageFile = async (path: string) => {
    try {
      await fetch(`${apiBase}/api/git/unstage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      loadGitStatus();
      if (selectedDiffFile?.path === path) {
        setSelectedDiffFile({ path, staged: false });
        loadDiff(path, false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageAll = async () => {
    const unstaged = changedFiles.filter(f => f.status.endsWith('M') || f.status === '??' || f.status.endsWith('D'));
    for (const f of unstaged) {
      await fetch(`${apiBase}/api/git/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: f.path })
      });
    }
    loadGitStatus();
  };

  const handleUnstageAll = async () => {
    const staged = changedFiles.filter(f => f.status.startsWith('M') || f.status.startsWith('A') || f.status.startsWith('D'));
    for (const f of staged) {
      await fetch(`${apiBase}/api/git/unstage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: f.path })
      });
    }
    loadGitStatus();
  };

  const loadDiff = async (path: string, staged: boolean) => {
    try {
      const res = await fetch(`${apiBase}/api/git/diff?path=${encodeURIComponent(path)}&staged=${staged}`);
      const data = await res.json();
      setFileDiff(data.diff || 'No changes or binary file.');
    } catch (e) {
      setFileDiff('Error loading diff.');
    }
  };

  const handleFileClick = (file: GitFile, staged: boolean) => {
    setSelectedDiffFile({ path: file.path, staged });
    loadDiff(file.path, staged);
  };

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() && !gitAutoCommit) return;

    setIsLoading(true);
    setGitOutput('Committing changes...');
    try {
      const res = await fetch(`${apiBase}/api/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          autoCommit: gitAutoCommit
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCommitMessage('');
        setGitOutput(data.output || 'Changes committed successfully.');
        loadGitStatus();
      } else {
        setGitOutput(`Commit failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setGitOutput(`Error committing: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutBranch = async (name: string) => {
    setIsLoading(true);
    setGitOutput(`Checking out branch ${name}...`);
    try {
      const res = await fetch(`${apiBase}/api/git/branches/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setGitOutput(`Switched to branch ${name}`);
        loadGitStatus();
        loadProjectFiles();
      } else {
        const data = await res.json();
        setGitOutput(`Checkout failed: ${data.error}`);
      }
    } catch (e: any) {
      setGitOutput(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsLoading(true);
    setGitOutput(`Creating branch ${newBranchName}...`);
    try {
      const res = await fetch(`${apiBase}/api/git/branches/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim() })
      });
      if (res.ok) {
        setGitOutput(`Created and switched to branch ${newBranchName}`);
        setNewBranchName('');
        setShowBranchCreator(false);
        loadGitStatus();
      } else {
        const data = await res.json();
        setGitOutput(`Branch creation failed: ${data.error}`);
      }
    } catch (e: any) {
      setGitOutput(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/git/remotes/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRemoteName.trim(), url: newRemoteUrl.trim() })
      });
      if (res.ok) {
        setGitOutput(`Added remote ${newRemoteName}`);
        setNewRemoteName('');
        setNewRemoteUrl('');
        loadGitStatus();
      } else {
        const data = await res.json();
        setGitOutput(`Failed to add remote: ${data.error}`);
      }
    } catch (e: any) {
      setGitOutput(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRemote = async (name: string) => {
    if (!confirm(`Are you sure you want to remove remote ${name}?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/git/remotes/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setGitOutput(`Removed remote ${name}`);
        loadGitStatus();
      } else {
        const data = await res.json();
        setGitOutput(`Failed to remove remote: ${data.error}`);
      }
    } catch (e: any) {
      setGitOutput(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    setGitOutput(`Running git push ${selectedRemote} ${selectedBranch}...`);
    try {
      const res = await fetch(`${apiBase}/api/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remote: selectedRemote, branch: selectedBranch })
      });
      const data = await res.json();
      setGitOutput(data.output || 'Push command completed.');
      loadGitStatus();
    } catch (e: any) {
      setGitOutput(`Error pushing: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    setGitOutput(`Running git pull ${selectedRemote} ${selectedBranch}...`);
    try {
      const res = await fetch(`${apiBase}/api/git/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remote: selectedRemote, branch: selectedBranch })
      });
      const data = await res.json();
      setGitOutput(data.output || 'Pull command completed.');
      loadGitStatus();
      loadProjectFiles();
    } catch (e: any) {
      setGitOutput(`Error pulling: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get status indicators
  const getFileStatusBadge = (status: string) => {
    const cleanStatus = status.trim();
    if (cleanStatus === 'M') return <span style={{ color: '#eab308', fontWeight: 'bold' }}>M</span>;
    if (cleanStatus === 'A') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>A</span>;
    if (cleanStatus === 'D') return <span style={{ color: '#dc2626', fontWeight: 'bold' }}>D</span>;
    if (cleanStatus === '??') return <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>U</span>;
    return <span style={{ color: '#2563eb' }}>{cleanStatus}</span>;
  };

  // Split changes
  const stagedChanges = changedFiles.filter(f => f.status.startsWith('M') || f.status.startsWith('A') || f.status.startsWith('D'));
  const unstagedChanges = changedFiles.filter(f => f.status.endsWith('M') || f.status === '??' || f.status.endsWith('D'));

  // Commit Graph Calculation
  const renderCommitGraph = () => {
    if (commits.length === 0) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-dim)' }}>
          No commits in repository yet.
        </div>
      );
    }

    const ROW_HEIGHT = 48;
    const COLUMN_WIDTH = 20;
    const X_PAD = 20;
    const Y_PAD = ROW_HEIGHT / 2;

    const lanes: (string | null)[] = [];
    const commitLanes: { [sha: string]: number } = {};

    // 1. Assign Lane Columns to each commit
    commits.forEach((commit) => {
      let laneIndex = lanes.indexOf(commit.sha);
      if (laneIndex === -1) {
        laneIndex = lanes.findIndex(l => l === null);
        if (laneIndex === -1) {
          laneIndex = lanes.length;
        }
        lanes[laneIndex] = commit.sha;
      }
      commitLanes[commit.sha] = laneIndex;

      // Free the lane slot for this commit
      lanes[laneIndex] = null;

      // Occupy lanes with parents
      commit.parents.forEach((parentSha) => {
        let parentLane = lanes.indexOf(parentSha);
        if (parentLane === -1) {
          parentLane = lanes.findIndex(l => l === null);
          if (parentLane === -1) {
            parentLane = lanes.length;
          }
          lanes[parentLane] = parentSha;
        }
      });
    });

    const shaToRow: { [sha: string]: number } = {};
    commits.forEach((c, idx) => {
      shaToRow[c.sha] = idx;
    });

    // 2. Generate line paths
    const paths: React.ReactNode[] = [];
    commits.forEach((commit, rowIndex) => {
      const childLane = commitLanes[commit.sha];
      const cx = X_PAD + childLane * COLUMN_WIDTH;
      const cy = rowIndex * ROW_HEIGHT + Y_PAD;

      commit.parents.forEach((parentSha) => {
        const parentRowIndex = shaToRow[parentSha];
        if (parentRowIndex !== undefined) {
          const parentLane = commitLanes[parentSha];
          const px = X_PAD + parentLane * COLUMN_WIDTH;
          const py = parentRowIndex * ROW_HEIGHT + Y_PAD;

          const laneColor = LANE_COLORS[childLane % LANE_COLORS.length];

          // Draw a curved Bézier path
          const pathD = `M ${cx} ${cy} C ${cx} ${(cy + py) / 2}, ${px} ${(cy + py) / 2}, ${px} ${py}`;
          paths.push(
            <path
              key={`${commit.sha}-${parentSha}`}
              d={pathD}
              fill="none"
              stroke={laneColor}
              strokeWidth="2.5"
              opacity="0.75"
            />
          );
        } else {
          // Parent is outside the list, draw a line going off the bottom
          const laneColor = LANE_COLORS[childLane % LANE_COLORS.length];
          const py = commits.length * ROW_HEIGHT;
          const pathD = `M ${cx} ${cy} L ${cx} ${py}`;
          paths.push(
            <path
              key={`${commit.sha}-orphan`}
              d={pathD}
              fill="none"
              stroke={laneColor}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          );
        }
      });
    });

    const maxLane = Math.max(...Object.values(commitLanes), 0) + 1;
    const svgWidth = X_PAD + maxLane * COLUMN_WIDTH + 10;
    const svgHeight = commits.length * ROW_HEIGHT;

    return (
      <div style={{ position: 'relative', overflowX: 'auto', display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-editor)' }}>
        
        {/* SVG Drawing Layer */}
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${svgWidth}px`,
            height: `${svgHeight}px`,
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          {paths}
          {commits.map((commit, rowIndex) => {
            const lane = commitLanes[commit.sha];
            const cx = X_PAD + lane * COLUMN_WIDTH;
            const cy = rowIndex * ROW_HEIGHT + Y_PAD;
            const nodeColor = LANE_COLORS[lane % LANE_COLORS.length];

            return (
              <circle
                key={commit.sha}
                cx={cx}
                cy={cy}
                r="6"
                fill={nodeColor}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* Text descriptions stacked on top of SVG spacing */}
        <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
          {commits.map((commit) => {
            const graphSpacing = svgWidth;
            const isActiveCommit = commit.refs.some(r => r.includes('HEAD') || r === activeBranch);

            return (
              <div
                key={commit.sha}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: `${ROW_HEIGHT}px`,
                  paddingLeft: `${graphSpacing}px`,
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  background: isActiveCommit ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                  cursor: 'default',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.04)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActiveCommit ? 'rgba(37, 99, 235, 0.04)' : 'transparent'}
              >
                {/* Short SHA */}
                <span style={{ color: 'var(--color-dim)', width: '70px', minWidth: '70px', marginRight: '12px' }}>
                  {commit.sha.substring(0, 7)}
                </span>

                {/* Tags / refs */}
                {commit.refs.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginRight: '10px' }}>
                    {commit.refs.map((ref, rIdx) => {
                      const isHead = ref.includes('HEAD');
                      const isBranch = branches.includes(ref.replace('HEAD -> ', '').trim());
                      const badgeBg = isHead
                        ? 'var(--primary)'
                        : isBranch
                          ? 'var(--secondary)'
                          : 'var(--accent)';
                      return (
                        <span
                          key={rIdx}
                          style={{
                            background: badgeBg,
                            color: '#fff',
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}
                        >
                          {ref}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Commit subject message */}
                <span style={{ fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '16px' }}>
                  {commit.subject}
                </span>

                {/* Author & Date */}
                <span style={{ color: 'var(--color-muted)', fontSize: '11px', marginRight: '12px' }}>
                  [{commit.author}]
                </span>
                <span style={{ color: 'var(--color-dim)', fontSize: '11px' }}>
                  {commit.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If Git is not initialized yet
  if (!gitInitialized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', padding: '24px', background: 'var(--bg-main)' }}>
        <div className="glass-panel" style={{ width: '480px', padding: '32px', textAlign: 'center', background: 'var(--bg-card)' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><IconGitCommit size={48} color="var(--color-dim)" /></div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '12px' }}>
            Version Control Uninitialized
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
            Backy has advanced version control features. Initialize a Git repository in this project to track file modifications, manage branches, and enable auto-commits.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleInitializeRepo} disabled={isLoading}>
            {isLoading ? 'Initializing...' : 'Initialize Git Repository'}
          </button>
        </div>
        {gitOutput && (
          <pre style={{ marginTop: '20px', width: '480px', padding: '12px', background: 'var(--bg-editor)', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowX: 'auto' }}>
            {gitOutput}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 110px)', padding: '24px', gap: '20px', overflow: 'hidden', marginTop: '75px', background: 'var(--bg-main)' }}>
      
      {/* LEFT COLUMN: Stage status & actions */}
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Branch Section */}
        <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>
              Branch: {activeBranch || 'detaching'}
            </h3>
            <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setShowBranchCreator(!showBranchCreator)}>
              {showBranchCreator ? 'Cancel' : '+ New'}
            </button>
          </div>

          {showBranchCreator && (
            <form onSubmit={handleCreateBranch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                className="input-field input-field-mono"
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                placeholder="branch-name"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={isLoading}>
                Create
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
            {branches.map((bName) => (
              <div
                key={bName}
                onClick={() => bName !== activeBranch && handleCheckoutBranch(bName)}
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: bName === activeBranch ? 'default' : 'pointer',
                  background: bName === activeBranch ? 'var(--primary-glow)' : 'transparent',
                  border: bName === activeBranch ? '1px solid var(--primary)' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{bName}</span>
                {bName === activeBranch && <span style={{ fontSize: '10px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><IconCheck size={10} /> Active</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Changes Status Section */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-card)', minHeight: '300px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
            Staging Changes
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Staged list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 'bold' }}>
                  Staged ({stagedChanges.length})
                </span>
                {stagedChanges.length > 0 && (
                  <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={handleUnstageAll}>
                    Unstage All
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stagedChanges.map((file) => (
                  <div
                    key={`staged-${file.path}`}
                    onClick={() => handleFileClick(file, true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(22, 163, 74, 0.04)',
                      border: '1px solid rgba(22, 163, 74, 0.1)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {getFileStatusBadge(file.status)}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: '2px 4px', fontSize: '9px', borderColor: 'rgba(22, 163, 74, 0.3)' }}
                      onClick={(e) => { e.stopPropagation(); handleUnstageFile(file.path); }}
                    >
                      -
                    </button>
                  </div>
                ))}
                {stagedChanges.length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-dim)', padding: '6px 8px' }}>
                    No staged changes
                  </div>
                )}
              </div>
            </div>

            {/* Unstaged list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 'bold' }}>
                  Unstaged / Untracked ({unstagedChanges.length})
                </span>
                {unstagedChanges.length > 0 && (
                  <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={handleStageAll}>
                    Stage All
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {unstagedChanges.map((file) => (
                  <div
                    key={`unstaged-${file.path}`}
                    onClick={() => handleFileClick(file, false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      background: '#fafbfc',
                      border: '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {getFileStatusBadge(file.status)}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: '2px 4px', fontSize: '9px' }}
                      onClick={(e) => { e.stopPropagation(); handleStageFile(file.path); }}
                    >
                      +
                    </button>
                  </div>
                ))}
                {unstagedChanges.length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-dim)', padding: '6px 8px' }}>
                    Clean working directory
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Commit Form */}
          <form onSubmit={handleCommit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="auto-commit-toggle"
                checked={gitAutoCommit}
                onChange={e => onToggleAutoCommit(e.target.checked)}
              />
              <label htmlFor="auto-commit-toggle" style={{ fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                Auto-commit (uses <code>git commit-auto</code>)
              </label>
            </div>

            {!gitAutoCommit && (
              <textarea
                className="input-field input-field-mono"
                style={{ height: '50px', fontSize: '12px', resize: 'none' }}
                placeholder="Commit message..."
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                required={!gitAutoCommit}
              />
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
              disabled={isLoading || (!gitAutoCommit && stagedChanges.length === 0)}
            >
              {isLoading
                ? 'Processing...'
                : gitAutoCommit
                  ? 'Commit via AI Script'
                  : 'Commit Staged Changes'}
            </button>
          </form>

        </div>

      </div>

      {/* RIGHT COLUMN: Commit Graph Visualizer, Diffs & Remotes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
        
        {/* SVG Commit Graph */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-card)', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '12px' }}>
            Git Commit History & Graph
          </h3>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderCommitGraph()}
          </div>
        </div>

        {/* Remotes Panel */}
        <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowRemotes(!showRemotes)}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconCloud size={14} /> Remotes Control ({remotes.length})
            </h3>
            <span>{showRemotes ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
          </div>

          {showRemotes && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Push / Pull controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className="input-field"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  value={selectedRemote}
                  onChange={e => setSelectedRemote(e.target.value)}
                >
                  {remotes.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  {remotes.length === 0 && <option value="">No remotes</option>}
                </select>

                <select
                  className="input-field"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handlePull} disabled={isLoading || remotes.length === 0}>
                  Pull
                </button>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handlePush} disabled={isLoading || remotes.length === 0}>
                  Push
                </button>
              </div>

              {/* Remotes list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                {remotes.map(rem => (
                  <div
                    key={rem.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: '#fafbfc',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>{rem.name}</strong>: <span style={{ color: 'var(--color-muted)' }}>{rem.fetchUrl}</span>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '2px 6px', fontSize: '9px' }} onClick={() => handleRemoveRemote(rem.name)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Remote Form */}
              <form onSubmit={handleAddRemote} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <input
                  type="text"
                  placeholder="remote-name (e.g. origin)"
                  className="input-field input-field-mono"
                  style={{ flex: 0.3, padding: '4px 8px', fontSize: '11px' }}
                  value={newRemoteName}
                  onChange={e => setNewRemoteName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="remote-url (e.g. git@github.com:...)"
                  className="input-field input-field-mono"
                  style={{ flex: 0.7, padding: '4px 8px', fontSize: '11px' }}
                  value={newRemoteUrl}
                  onChange={e => setNewRemoteUrl(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} disabled={isLoading}>
                  Add Remote
                </button>
              </form>

            </div>
          )}
        </div>

        {/* Diff Viewer overlay/panel */}
        {selectedDiffFile && (
          <div className="glass-panel animate-fade-in" style={{ padding: '16px', background: 'var(--bg-card)', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                Diff: {selectedDiffFile.path} {selectedDiffFile.staged ? '(Staged)' : '(Unstaged)'}
              </h4>
              <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setSelectedDiffFile(null)}>
                Close Diff
              </button>
            </div>
            
            <pre
              style={{
                flex: 1,
                overflow: 'auto',
                background: 'var(--bg-editor)',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.4',
                color: 'var(--color-text)',
                margin: 0
              }}
            >
              {fileDiff.split('\n').map((line, lIdx) => {
                let color = 'inherit';
                let bg = 'transparent';
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  color = '#16a34a';
                  bg = 'rgba(22, 163, 74, 0.05)';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  color = '#dc2626';
                  bg = 'rgba(220, 38, 38, 0.05)';
                } else if (line.startsWith('@@')) {
                  color = 'var(--primary)';
                  bg = 'var(--primary-glow)';
                }
                return (
                  <div key={lIdx} style={{ color, backgroundColor: bg, padding: '0 4px', borderRadius: '2px' }}>
                    {line}
                  </div>
                );
              })}
              {fileDiff === '' && 'Loading diff...'}
            </pre>
          </div>
        )}

        {/* Command Output Logger */}
        {gitOutput && (
          <div className="glass-panel" style={{ padding: '12px', background: 'var(--bg-terminal)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                Git Terminal Output
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--color-muted)' }} onClick={() => setGitOutput('')}>
                Clear
              </button>
            </div>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>
              {gitOutput}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
}
