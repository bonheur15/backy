import { join, basename } from 'path';
import { existsSync, statSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { ProjectManager } from './project-manager';
import { ProjectRunner } from './runner';

// Resolve project target path from arguments or default to a demo-project folder
const defaultProjectPath = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(import.meta.dir, '../../../demo-project');

let currentProjectPath = defaultProjectPath;
let manager = new ProjectManager(currentProjectPath);
let runner = new ProjectRunner(currentProjectPath);

// Setup projects directory under backy root
const projectsDir = join(import.meta.dir, '../../../projects');
if (!existsSync(projectsDir)) {
  mkdirSync(projectsDir, { recursive: true });
}

// Active websocket connections for logs
const wsConnections = new Set<any>();
let unregisterLog: (() => void) | null = null;

function bindRunnerLogs() {
  if (unregisterLog) unregisterLog();
  unregisterLog = runner.onLog((log) => {
    const payload = JSON.stringify({ type: 'log', data: log });
    for (const ws of wsConnections) {
      try {
        ws.send(payload);
      } catch (e) {
        wsConnections.delete(ws);
      }
    }
  });
}

// Initialize project template if it doesn't exist
console.log(`[Backy] Project target path: ${currentProjectPath}`);
await manager.initProject();

// Install target project dependencies if not present
const nodeModulesPath = join(currentProjectPath, 'node_modules');
if (!existsSync(nodeModulesPath)) {
  console.log(`[Backy] target project node_modules not found. Executing bun install...`);
  await runner.runBunInstall();
}

bindRunnerLogs();

// Auto-start backend dev server on boot
runner.startDevServer();

const PORT = 3000;

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket log stream
    if (url.pathname === '/ws/logs') {
      const success = server.upgrade(req);
      if (success) {
        return undefined; // Handled by WebSocket handlers
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Handle API endpoints
    if (url.pathname.startsWith('/api')) {
      return handleAPI(req, url);
    }

    // Serve Frontend
    return handleFrontend(req, url);
  },
  websocket: {
    open(ws) {
      wsConnections.add(ws);
      ws.send(JSON.stringify({ type: 'log', data: '\n--- Connected to Backy Console Log Stream ---\n' }));
    },
    message(ws, message) {
      // Client messages ignored for now
    },
    close(ws) {
      wsConnections.delete(ws);
    }
  }
});

console.log(`🚀 Backy CLI Editor running at http://localhost:${PORT}`);

async function runGit(args: string[]): Promise<string> {
  const proc = Bun.spawn({
    cmd: ['git', ...args],
    cwd: currentProjectPath,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    // Filter out git "hint:" lines — they appear on stderr even on success
    const realErrors = stderr.split('\n').filter(l => !l.startsWith('hint:')).join('\n').trim();
    throw new Error(realErrors || stdout || `Git command failed with code ${exitCode}`);
  }
  return stdout;
}

async function isGitInit(): Promise<boolean> {
  try {
    const res = await runGit(['rev-parse', '--is-inside-work-tree']);
    return res.trim() === 'true';
  } catch (e) {
    return false;
  }
}

async function checkTriggerAutoCommit() {
  try {
    const meta = await manager.getMetadata();
    if (meta.gitAutoCommit && await isGitInit()) {
      console.log(`[Backy Git] Auto-committing changes...`);
      await runGit(['add', '.']);
      
      const diffOutput = await runGit(['diff', '--cached', '--name-only']);
      if (!diffOutput.trim()) {
        console.log(`[Backy Git] No changes to commit.`);
        return;
      }
      
      console.log(`[Backy Git] Running git-commit-auto...`);
      const whichProc = Bun.spawn({ cmd: ['which', 'git-commit-auto'] });
      const hasCommitAuto = (await whichProc.exited) === 0;
      if (!hasCommitAuto) {
        const warning = `\n[Git Auto Commit] Warning: 'git-commit-auto' command is not found. Please install it on your OS to enable automatic commits.\n`;
        runner.broadcastLog(warning);
        return;
      }
      
      const proc = Bun.spawn({
        cmd: ['git-commit-auto'],
        cwd: currentProjectPath,
        stdout: 'pipe',
        stderr: 'pipe'
      });
      
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const output = stdout + stderr;
      runner.broadcastLog(`\n--- Git Auto Commit ---\n${output}\n-----------------------\n`);
    }
  } catch (e: any) {
    console.error(`[Backy Git] Auto commit failed:`, e.message);
  }
}

async function handleAPI(req: Request, url: URL): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ----------------------------------------------------
    // Projects Endpoints
    // ----------------------------------------------------
    if (url.pathname === '/api/projects' && req.method === 'GET') {
      const projects: { name: string; path: string; isActive: boolean }[] = [];
      
      // Include demo-project
      const demoPath = defaultProjectPath;
      if (existsSync(demoPath)) {
        projects.push({
          name: 'demo-project',
          path: demoPath,
          isActive: currentProjectPath === demoPath
        });
      }

      // Add user created projects
      if (existsSync(projectsDir)) {
        const dirs = readdirSync(projectsDir);
        for (const dir of dirs) {
          const fullPath = join(projectsDir, dir);
          if (statSync(fullPath).isDirectory()) {
            projects.push({
              name: dir,
              path: fullPath,
              isActive: currentProjectPath === fullPath
            });
          }
        }
      }
      return Response.json(projects, { headers: corsHeaders });
    }

    if (url.pathname === '/api/projects/current' && req.method === 'GET') {
      return Response.json({
        name: basename(currentProjectPath),
        path: currentProjectPath,
        running: runner.isServerRunning()
      }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/projects/create' && req.method === 'POST') {
      const body = await req.json();
      const sanitizedName = body.name.replace(/[^a-zA-Z0-9-_]/g, '');
      if (!sanitizedName) {
        return new Response(JSON.stringify({ error: 'Invalid project name' }), { status: 400, headers: corsHeaders });
      }

      const targetPath = join(projectsDir, sanitizedName);
      if (existsSync(targetPath)) {
        return new Response(JSON.stringify({ error: 'Project already exists' }), { status: 400, headers: corsHeaders });
      }

      // Initialize the project using ProjectManager
      const tempManager = new ProjectManager(targetPath);
      await tempManager.initProject();

      // Trigger bun install in background
      const tempRunner = new ProjectRunner(targetPath);
      tempRunner.runBunInstall().catch(console.error);

      return Response.json({ status: 'ok', name: sanitizedName, path: targetPath }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/projects/open' && req.method === 'POST') {
      const body = await req.json();
      const targetPath = body.path;
      if (!existsSync(targetPath)) {
        return new Response(JSON.stringify({ error: 'Project path not found' }), { status: 404, headers: corsHeaders });
      }

      runner.stopDevServer();
      currentProjectPath = targetPath;
      manager = new ProjectManager(currentProjectPath);
      runner = new ProjectRunner(currentProjectPath);
      
      await manager.initProject();
      bindRunnerLogs();

      // Run bun install if node_modules doesn't exist
      const nodeModulesPath = join(currentProjectPath, 'node_modules');
      if (!existsSync(nodeModulesPath)) {
        runner.broadcastLog(`\n[Backy] node_modules not found in target project. Installing...\n`);
        runner.runBunInstall().then(() => {
          runner.startDevServer();
        }).catch(e => {
          runner.broadcastLog(`\n[Backy] Error running bun install: ${e.message}\n`);
        });
      } else {
        runner.startDevServer();
      }

      return Response.json({ status: 'ok', path: currentProjectPath }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/projects/delete' && req.method === 'POST') {
      const body = await req.json();
      const targetPath = body.path;
      
      if (!existsSync(targetPath)) {
        return new Response(JSON.stringify({ error: 'Project path not found' }), { status: 404, headers: corsHeaders });
      }

      if (targetPath === currentProjectPath) {
        return new Response(JSON.stringify({ error: 'Cannot delete active project. Switch to another project first.' }), { status: 400, headers: corsHeaders });
      }

      // Delete recursively
      rmSync(targetPath, { recursive: true, force: true });
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // ----------------------------------------------------
    // Git Endpoints
    // ----------------------------------------------------
    if (url.pathname === '/api/git/status' && req.method === 'GET') {
      const initialized = await isGitInit();
      if (!initialized) {
        return Response.json({ initialized: false, files: [] }, { headers: corsHeaders });
      }

      const statusOutput = await runGit(['status', '--porcelain']);
      const lines = statusOutput.split('\n').filter(Boolean);
      const files = lines.map(line => {
        const status = line.substring(0, 2);
        let path = line.substring(3).trim();
        if (path.startsWith('"') && path.endsWith('"')) {
          path = path.slice(1, -1);
        }
        return {
          path,
          status,
          name: path.split('/').pop() || path
        };
      });

      return Response.json({ initialized: true, files }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/init' && req.method === 'POST') {
      await runGit(['init']);
      try {
        await runGit(['checkout', '-b', 'main']);
      } catch (e) {}
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/diff' && req.method === 'GET') {
      const filePath = url.searchParams.get('path') || '.';
      const staged = url.searchParams.get('staged') === 'true';
      const args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];
      const diff = await runGit(args);
      return Response.json({ diff }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/log' && req.method === 'GET') {
      const initialized = await isGitInit();
      if (!initialized) {
        return Response.json({ commits: [] }, { headers: corsHeaders });
      }

      try {
        const logOutput = await runGit(['log', '--pretty=format:%H|%P|%d|%an|%cr|%s', '-n', '100']);
        const lines = logOutput.split('\n').filter(Boolean);
        const commits = lines.map(line => {
          const [sha, parentsStr, refsStr, author, date, subject] = line.split('|');
          const parents = parentsStr ? parentsStr.split(' ').filter(Boolean) : [];
          let refs: string[] = [];
          if (refsStr) {
            const cleanedRefs = refsStr.trim().replace(/^\((.*)\)$/, '$1');
            refs = cleanedRefs.split(', ').map(r => r.trim()).filter(Boolean);
          }
          return { sha, parents, refs, author, date, subject };
        });
        return Response.json({ commits }, { headers: corsHeaders });
      } catch (e) {
        // May error if repo has no commits
        return Response.json({ commits: [] }, { headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/git/branches' && req.method === 'GET') {
      const initialized = await isGitInit();
      if (!initialized) {
        return Response.json({ branches: [], activeBranch: '' }, { headers: corsHeaders });
      }

      let activeBranch = '';
      try {
        activeBranch = (await runGit(['branch', '--show-current'])).trim();
      } catch (e) {}

      const branchOutput = await runGit(['branch', '-a']);
      const branches = branchOutput.split('\n')
        .map(b => b.replace(/^\*/, '').trim())
        .filter(Boolean);

      return Response.json({ branches, activeBranch }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/branches/create' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['checkout', '-b', body.name]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/branches/checkout' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['checkout', body.name]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/stage' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['add', body.path]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/unstage' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['restore', '--staged', body.path]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/commit' && req.method === 'POST') {
      const body = await req.json();
      
      if (body.autoCommit) {
        const whichProc = Bun.spawn({ cmd: ['which', 'git-commit-auto'] });
        const hasCommitAuto = (await whichProc.exited) === 0;
        if (!hasCommitAuto) {
          return new Response(JSON.stringify({ error: "Command 'git commit-auto' is not installed. Please install it on your OS." }), { status: 400, headers: corsHeaders });
        }

        const proc = Bun.spawn({
          cmd: ['git-commit-auto'],
          cwd: currentProjectPath,
          stdout: 'pipe',
          stderr: 'pipe'
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const output = stdout + stderr;
        runner.broadcastLog(`\n[Git Auto Commit Output]:\n${output}\n`);
        
        if (proc.exitCode !== 0 && proc.exitCode !== undefined) {
          return new Response(JSON.stringify({ error: output || 'git-commit-auto failed' }), { status: 500, headers: corsHeaders });
        }

        return Response.json({ status: 'ok', output }, { headers: corsHeaders });
      } else {
        await runGit(['commit', '-m', body.message]);
        return Response.json({ status: 'ok' }, { headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/git/push' && req.method === 'POST') {
      const body = await req.json();
      const remote = body.remote || 'origin';
      const branch = body.branch || 'main';
      
      runner.broadcastLog(`\n--- Running git push ${remote} ${branch} ---\n`);
      const proc = Bun.spawn({
        cmd: ['git', 'push', remote, branch],
        cwd: currentProjectPath,
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const output = stdout + stderr;
      runner.broadcastLog(output);
      
      return Response.json({ status: 'ok', output }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/pull' && req.method === 'POST') {
      const body = await req.json();
      const remote = body.remote || 'origin';
      const branch = body.branch || 'main';

      runner.broadcastLog(`\n--- Running git pull ${remote} ${branch} ---\n`);
      const proc = Bun.spawn({
        cmd: ['git', 'pull', remote, branch],
        cwd: currentProjectPath,
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const output = stdout + stderr;
      runner.broadcastLog(output);

      return Response.json({ status: 'ok', output }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/remotes' && req.method === 'GET') {
      const initialized = await isGitInit();
      if (!initialized) {
        return Response.json({ remotes: [] }, { headers: corsHeaders });
      }

      const remoteOutput = await runGit(['remote', '-v']);
      const lines = remoteOutput.split('\n').filter(Boolean);
      const remotesMap = new Map<string, { fetch?: string, push?: string }>();
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const [name, url, type] = parts;
          const cleanType = type.replace(/^\((.*)\)$/, '$1');
          const entry = remotesMap.get(name) || {};
          if (cleanType === 'fetch') entry.fetch = url;
          if (cleanType === 'push') entry.push = url;
          remotesMap.set(name, entry);
        }
      }

      const remotes = Array.from(remotesMap.entries()).map(([name, urls]) => ({
        name,
        fetchUrl: urls.fetch || '',
        pushUrl: urls.push || ''
      }));

      return Response.json({ remotes }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/remotes/add' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['remote', 'add', body.name, body.url]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/git/remotes/remove' && req.method === 'POST') {
      const body = await req.json();
      await runGit(['remote', 'remove', body.name]);
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // ----------------------------------------------------
    // Existing Project Metadata / Endpoint / File APIs
    // ----------------------------------------------------
    if (url.pathname === '/api/metadata' && req.method === 'GET') {
      const meta = await manager.getMetadata();
      return Response.json(meta, { headers: corsHeaders });
    }

    if (url.pathname === '/api/metadata' && req.method === 'POST') {
      const body = await req.json();
      await manager.saveMetadata(body);
      await manager.syncDatabaseSchema(body.dbModels);

      for (const ep of body.endpoints) {
        await manager.syncEndpoint(ep, body);
      }
      await manager.syncIndexImports();
      await manager.syncLogicBlocks(body.logicBlocks || [], body);
      // Trigger Git auto commit if enabled
      checkTriggerAutoCommit();

      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }
    if (url.pathname === '/api/endpoints/sync' && req.method === 'POST') {
      const body = await req.json();
      const meta = await manager.getMetadata();
      await manager.syncEndpoint(body.endpoint, meta);

      const idx = meta.endpoints.findIndex(e => e.id === body.endpoint.id);
      if (idx !== -1) {
        meta.endpoints[idx] = body.endpoint;
      } else {
        meta.endpoints.push(body.endpoint);
      }
      await manager.saveMetadata(meta);

      checkTriggerAutoCommit();

      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/endpoints/delete' && req.method === 'POST') {
      const body = await req.json();
      await manager.deleteEndpoint(body.id, body.name, body.method);

      const meta = await manager.getMetadata();
      meta.endpoints = meta.endpoints.filter(e => e.id !== body.id);
      await manager.saveMetadata(meta);

      checkTriggerAutoCommit();

      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/files' && req.method === 'GET') {
      const files = await manager.listProjectFiles();
      return Response.json(files, { headers: corsHeaders });
    }

    if (url.pathname === '/api/files/content' && req.method === 'GET') {
      const relPath = url.searchParams.get('path');
      if (!relPath) return new Response('Path required', { status: 400, headers: corsHeaders });
      const content = await manager.getFileContent(relPath);
      return Response.json({ content }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/files/content' && req.method === 'POST') {
      const body = await req.json();
      await manager.writeFileContent(body.path, body.content);

      checkTriggerAutoCommit();

      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/status' && req.method === 'GET') {
      return Response.json({ running: runner.isServerRunning() }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/start' && req.method === 'POST') {
      runner.startDevServer();
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/stop' && req.method === 'POST') {
      runner.stopDevServer();
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/restart' && req.method === 'POST') {
      runner.stopDevServer();
      runner.startDevServer();
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/db-push' && req.method === 'POST') {
      const output = await runner.runDbPush();
      return Response.json({ output }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/server/install' && req.method === 'POST') {
      const body = await req.json();
      const output = await runner.runBunInstall(body.packages);
      return Response.json({ output }, { headers: corsHeaders });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleFrontend(req: Request, url: URL): Promise<Response> {
  const distPath = join(import.meta.dir, '../../client/dist');
  const localFilePath = join(distPath, url.pathname);

  // If built client assets exist locally, serve them
  if (existsSync(localFilePath) && !statSync(localFilePath).isDirectory()) {
    return new Response(Bun.file(localFilePath));
  }

  // Fallback to proxying to Vite dev server (localhost:5173) in development
  try {
    const viteUrl = `http://localhost:5173${url.pathname}${url.search}`;
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const viteResponse = await fetch(viteUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
    });

    return new Response(viteResponse.body, {
      status: viteResponse.status,
      headers: viteResponse.headers
    });
  } catch (e) {
    // If Vite is not running, try to fall back to dist/index.html
    const indexHtml = join(distPath, 'index.html');
    if (existsSync(indexHtml)) {
      return new Response(Bun.file(indexHtml));
    }

    return new Response(
      `<html>
        <head><title>Backy Loading...</title></head>
        <body style="font-family: sans-serif; background: #050505; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <h2 style="color: #a855f7;">Backy Client Not Ready</h2>
          <p style="color: #888;">Build the client using <code>bun run build:client</code>, or start the dev server via <code>bun dev:client</code>.</p>
        </body>
      </html>`,
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
