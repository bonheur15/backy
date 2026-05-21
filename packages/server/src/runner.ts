import { spawn } from 'bun';
import type { Subprocess } from 'bun';

export class ProjectRunner {
  private projectPath: string;
  private devProcess: Subprocess<"pipe", "pipe", "pipe"> | null = null;
  private logCallbacks: Set<(log: string) => void> = new Set();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  onLog(callback: (log: string) => void) {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  public broadcastLog(data: string) {
    for (const cb of this.logCallbacks) {
      cb(data);
    }
  }

  startDevServer() {
    if (this.devProcess) {
      this.stopDevServer();
    }

    this.broadcastLog('\n--- Starting Backend Dev Server ---\n');

    // Spawn server in dev watch mode
    this.devProcess = spawn({
      cmd: ['bun', 'run', 'dev'],
      cwd: this.projectPath,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    this.readPipe(this.devProcess.stdout, false);
    this.readPipe(this.devProcess.stderr, true);
  }

  private async readPipe(stream: ReadableStream<Uint8Array>, isError: boolean) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        this.broadcastLog(text);
      }
    } catch (e) {
      // Stream finished or closed
    }
  }

  stopDevServer() {
    if (this.devProcess) {
      this.broadcastLog('\n--- Stopping Backend Dev Server ---\n');
      try {
        this.devProcess.kill();
      } catch (e) {
        // Process might already be dead
      }
      this.devProcess = null;
    }
  }

  async runDbPush(): Promise<string> {
    this.broadcastLog('\n--- Synchronizing Database Schema (drizzle-kit push) ---\n');
    const proc = spawn({
      cmd: ['bun', 'x', 'drizzle-kit', 'push'],
      cwd: this.projectPath,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = stdout + stderr;
    this.broadcastLog(output);
    this.broadcastLog('\n--- Database Sync Done ---\n');
    return output;
  }

  async runBunInstall(packages: string[] = []): Promise<string> {
    const cmd = packages.length > 0
      ? ['bun', 'add', ...packages]
      : ['bun', 'install'];

    this.broadcastLog(`\n--- Running ${cmd.join(' ')} ---\n`);
    const proc = spawn({
      cmd,
      cwd: this.projectPath,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = stdout + stderr;
    this.broadcastLog(output);
    this.broadcastLog('\n--- Package Management Done ---\n');
    return output;
  }

  isServerRunning(): boolean {
    return this.devProcess !== null;
  }
}
