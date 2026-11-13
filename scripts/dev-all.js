const { spawn } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function launch(name, cwd, args) {
  const child = spawn(npmCmd, args, {
    cwd,
    stdio: 'inherit',
    shell: isWin
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[${name}] terminó con código ${code}`);
    }
  });

  return child;
}

console.log('[Workspace] Iniciando Backend (puerto 4000) y Frontend (puerto 5173)...');
const backend = launch('backend', path.join(rootDir, 'backend'), ['run', 'dev']);
const frontend = launch('frontend', path.join(rootDir, 'frontend'), ['run', 'dev']);

function shutdown() {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
