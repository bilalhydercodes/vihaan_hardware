import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', '>>> Starting NAVIC-TRACK (Mock Server + Next.js App)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Spawn mock server
const mockProcess = spawn(npmCmd, ['start'], {
  cwd: path.join(__dirname, 'mock-server'),
  stdio: 'inherit',
  shell: true
});

// 2. Spawn Next.js web app
const webProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'web'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down NAVIC-TRACK servers...');
  try { mockProcess.kill(); } catch (e) {}
  try { webProcess.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

