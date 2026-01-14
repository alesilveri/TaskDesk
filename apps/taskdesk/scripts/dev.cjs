const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const primaryPort = 5173;
const fallbackPort = 5174;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function pickPort() {
  const primaryFree = await isPortFree(primaryPort);
  if (primaryFree) return primaryPort;
  const fallbackFree = await isPortFree(fallbackPort);
  if (fallbackFree) return fallbackPort;
  throw new Error(`Both ${primaryPort} and ${fallbackPort} are in use.`);
}

async function run() {
  const port = await pickPort();
  const env = {
    ...process.env,
    TASKDESK_DEV_SERVER_PORT: String(port),
    VITE_DEV_SERVER_PORT: String(port),
  };

  const concurrentlyBin = path.join(__dirname, '..', 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');

  const args = [
    '-k',
    'vite',
    'tsc -p electron/tsconfig.json -w',
    `wait-on tcp:127.0.0.1:${port} && electron .`,
  ];

  const child = spawn(process.execPath, [concurrentlyBin, ...args], {
    stdio: 'inherit',
    env,
  });

  const shutdown = (signal) => {
    if (!child.killed) {
      child.kill(signal ?? 'SIGINT');
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

run().catch((error) => {
  console.error('[taskdesk:dev]', error.message);
  process.exit(1);
});
