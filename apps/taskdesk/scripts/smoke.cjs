const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

if (!process.versions.electron) {
  const electronPath = require('electron');
  const result = spawnSync(electronPath, [__filename], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

const Database = require('better-sqlite3');

const projectRoot = path.join(__dirname, '..');
const distExport = path.join(projectRoot, 'dist-electron', 'export.js');

function ensureElectronBuild() {
  if (fs.existsSync(distExport)) return;
  console.log('[smoke] dist-electron missing, building electron TS...');
  execSync('npm run build:electron', { cwd: projectRoot, stdio: 'inherit' });
  if (!fs.existsSync(distExport)) {
    throw new Error('dist-electron/export.js not found after build:electron');
  }
}

function createTempDb() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskdesk-smoke-'));
  const dbPath = path.join(tempDir, 'taskdesk.sqlite');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE TABLE activities (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      client_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      minutes INTEGER NOT NULL,
      reference_verbale TEXT,
      resource_icon TEXT,
      tags TEXT,
      in_gestore INTEGER NOT NULL DEFAULT 0,
      verbale_done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'bozza',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `);

  const now = new Date().toISOString();
  const insertClient = db.prepare('INSERT INTO clients (id, name, created_at, updated_at, last_used_at) VALUES (?, ?, ?, ?, ?)');
  const insertActivity = db.prepare(
    `INSERT INTO activities (
      id, date, client_id, title, description, minutes, reference_verbale, resource_icon, tags, in_gestore, verbale_done, created_at, updated_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertClient.run('c-1', 'Cliente Alpha', now, now, now);
  insertClient.run('c-2', 'Cliente Beta', now, now, now);

  insertActivity.run(
    'a-1',
    '2026-01-14',
    'c-1',
    'Allineamento interno',
    'Check stato ticket e follow-up.',
    30,
    'VB-014',
    'ICON-OPS',
    'ops,follow',
    1,
    1,
    now,
    now,
    'inserita'
  );
  insertActivity.run(
    'a-2',
    '2026-01-15',
    'c-1',
    'Supporto cliente',
    'Chiusura richiesta urgente.',
    45,
    '',
    'ICON-SUP',
    'support',
    0,
    0,
    now,
    now,
    'bozza'
  );
  insertActivity.run(
    'a-3',
    '2026-01-16',
    'c-2',
    'Aggiornamento verbale',
    'Verifica note e consolidamento.',
    20,
    'VB-015',
    '',
    '',
    0,
    1,
    now,
    now,
    'bozza'
  );

  return { db, tempDir };
}

async function run() {
  console.log('[smoke] start');
  ensureElectronBuild();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { exportMonthlyXlsx, exportMonthlyCopy, exportWeeklyCopy } = require(distExport);

  const { db, tempDir } = createTempDb();
  const exportPath = path.join(tempDir, 'taskdesk-smoke-export.xlsx');

  await exportMonthlyXlsx(db, '2026-01', exportPath);
  if (!fs.existsSync(exportPath)) {
    throw new Error('Export file not created');
  }
  const size = fs.statSync(exportPath).size;
  if (size < 512) {
    throw new Error(`Export file too small: ${size} bytes`);
  }

  const monthlyCopy = exportMonthlyCopy(db, '2026-01');
  if (!monthlyCopy || !monthlyCopy.includes('Cliente')) {
    throw new Error('Monthly copy output invalid');
  }

  const weeklyCopy = exportWeeklyCopy(db, '2026-01-13', '2026-01-19');
  if (!weeklyCopy || !weeklyCopy.includes('Cliente')) {
    throw new Error('Weekly copy output invalid');
  }

  db.close();
  console.log('[smoke] ok - export generated at:', exportPath);
}

run().catch((error) => {
  console.error('[smoke] failed:', error.message);
  process.exit(1);
});
