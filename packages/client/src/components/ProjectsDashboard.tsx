import React, { useState, useEffect } from 'react';
import { IconAlertTriangle, IconBriefcase, IconPlus, IconTrash, IconFolder, IconCheck, IconChevronRight } from './Icons';

interface Project {
  name: string;
  path: string;
  isActive: boolean;
}

interface ProjectsDashboardProps {
  apiBase: string;
  onProjectOpened: () => void;
}

export default function ProjectsDashboard({ apiBase, onProjectOpened }: ProjectsDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects`);
      const data = await res.json();
      setProjects(data || []);
    } catch (e) {
      console.error('Error loading projects list:', e);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsLoading(true);
    setLoadingMessage(`Creating project "${newProjectName.trim()}"...`);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBase}/api/projects/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      });

      if (res.ok) {
        setNewProjectName('');
        setLoadingMessage('Project created successfully!');
        setTimeout(() => setLoadingMessage(''), 2000);
        loadProjects();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create project.');
      }
    } catch (e: any) {
      setErrorMsg(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProject = async (project: Project) => {
    if (project.isActive) return;

    setIsLoading(true);
    setLoadingMessage(`Opening project "${project.name}" (restarting server, installing dependencies if needed)...`);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBase}/api/projects/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: project.path })
      });

      if (res.ok) {
        onProjectOpened();
        loadProjects();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to open project.');
      }
    } catch (e: any) {
      setErrorMsg(`Error opening project: ${e.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (project.isActive) {
      alert('Cannot delete the active project. Switch to another project first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete project "${project.name}"? This deletes all files and cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Deleting project "${project.name}"...`);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBase}/api/projects/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: project.path })
      });

      if (res.ok) {
        loadProjects();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete project.');
      }
    } catch (e: any) {
      setErrorMsg(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const activeProjects = projects.filter(p => p.isActive);
  const inactiveProjects = projects.filter(p => !p.isActive);
  const sortedProjects = [...activeProjects, ...inactiveProjects];

  return (
    <div
      style={{
        background: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'calc(100vh - 110px)',
        overflowY: 'auto',
        marginTop: '75px',
        padding: '0',
      }}
    >
      {/* ── Header region ── */}
      <div
        style={{
          padding: '40px 48px 0 48px',
          maxWidth: '960px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconBriefcase size={18} color="var(--primary)" />
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            Workspaces
          </h1>
        </div>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-muted)',
            lineHeight: 1.6,
            marginLeft: '48px',
            maxWidth: '520px',
          }}
        >
          Create, switch, and manage your backend projects from one place.
        </p>

        {/* ── Inline create bar ── */}
        <form
          onSubmit={handleCreateProject}
          style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '14px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--color-dim)',
              }}
            >
              <IconFolder size={15} />
            </div>
            <input
              type="text"
              placeholder="New project name..."
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--primary)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; }}
          >
            <IconPlus size={14} color="#ffffff" />
            Create
          </button>
        </form>
      </div>

      {/* ── Status banners ── */}
      <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: '0 48px' }}>

        {/* Loading */}
        {isLoading && (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--primary-glow)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
            }}
          >
            <span className="status-indicator active" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--primary)' }}>
              {loadingMessage || 'Processing...'}
            </span>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--color-delete-glow)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            <IconAlertTriangle size={14} color="var(--color-delete)" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-delete)' }}>
              {errorMsg}
            </span>
          </div>
        )}
      </div>

      {/* ── Section divider ── */}
      <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: '0 48px' }}>
        <div
          style={{
            marginTop: '32px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-dim)',
            }}
          >
            All projects
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-dim)',
              background: '#f3f4f6',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '1px 7px',
              lineHeight: '18px',
            }}
          >
            {projects.length}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>
      </div>

      {/* ── Project list ── */}
      <div
        style={{
          maxWidth: '960px',
          width: '100%',
          margin: '0 auto',
          padding: '0 48px 48px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {sortedProjects.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 24px',
              borderRadius: '14px',
              border: '1px dashed var(--border-color)',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#f9fafb',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <IconFolder size={22} color="var(--color-dim)" />
            </div>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '4px',
              }}
            >
              No projects yet
            </span>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--color-muted)',
              }}
            >
              Create your first project using the form above.
            </span>
          </div>
        )}

        {sortedProjects.map((project) => (
          <div
            key={project.path}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid ' + (project.isActive ? 'rgba(37, 99, 235, 0.25)' : 'var(--border-color)'),
              boxShadow: project.isActive
                ? '0 0 0 1px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(37, 99, 235, 0.06)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.18s ease',
              cursor: project.isActive ? 'default' : 'pointer',
              overflow: 'hidden',
            }}
            onClick={() => { if (!project.isActive && !isLoading) handleOpenProject(project); }}
            onMouseEnter={e => {
              if (!project.isActive) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
              }
            }}
            onMouseLeave={e => {
              if (!project.isActive) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }
            }}
          >
            {/* Left accent bar for active */}
            {project.isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '8px',
                  bottom: '8px',
                  width: '3px',
                  borderRadius: '0 3px 3px 0',
                  background: 'var(--primary)',
                }}
              />
            )}

            {/* Icon */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: project.isActive ? 'var(--primary-glow)' : '#f9fafb',
                border: '1px solid ' + (project.isActive ? 'rgba(37, 99, 235, 0.15)' : 'var(--border-color)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconFolder
                size={16}
                color={project.isActive ? 'var(--primary)' : 'var(--color-muted)'}
              />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.name}
                </span>
                {project.isActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--color-get)',
                      background: 'var(--color-get-glow)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      lineHeight: '16px',
                      flexShrink: 0,
                    }}
                  >
                    <IconCheck size={10} color="var(--color-get)" />
                    Active
                  </span>
                )}
              </div>
              <span
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {project.path}
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
              onClick={e => e.stopPropagation()}
            >
              {!project.isActive && (
                <button
                  disabled={isLoading}
                  onClick={() => handleDeleteProject(project)}
                  title="Delete project"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: 'var(--color-dim)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-delete-glow)';
                    e.currentTarget.style.color = 'var(--color-delete)';
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-dim)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <IconTrash size={14} />
                </button>
              )}

              {!project.isActive && (
                <button
                  disabled={isLoading}
                  onClick={() => handleOpenProject(project)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--color-text)';
                  }}
                >
                  Open
                  <IconChevronRight size={12} />
                </button>
              )}

              {project.isActive && (
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-dim)',
                    fontWeight: 500,
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Current workspace
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
