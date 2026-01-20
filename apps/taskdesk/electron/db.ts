import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';

export type ActivityInput = {
  date: string;
  clientName?: string;
  title: string;
  description?: string;
  minutes: number;
  referenceVerbale?: string;
  resourceIcon?: string;
  tags?: string[];
  status?: ActivityStatus;
  inGestore?: boolean;
  verbaleDone?: boolean;
};

export type ActivityStatus = 'bozza' | 'inserita';

export type Activity = {
  id: string;
  date: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  minutes: number;
  referenceVerbale: string | null;
  resourceIcon: string | null;
  tags: string[];
  status: ActivityStatus;
  inGestore: boolean;
  verbaleDone: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type ActivityHistory = {
  id: string;
  activityId: string;
  summary: string;
  changedAt: string;
};

export type ActivityTemplate = {
  id: string;
  title: string;
  clientName: string | null;
  description: string | null;
  minutes: number;
  referenceVerbale: string | null;
  resourceIcon: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  lastUsedAt: string | null;
};

export type AppSettings = {
  dailyTargetMinutes: number;
  workingDaysPerWeek: 5 | 6 | 7;
  theme: 'light' | 'dark' | 'system';
  gapReminderMinutes: number;
  backupDir: string | null;
  autoStart: boolean;
  trayEnabled: boolean;
  hotkeyEnabled: boolean;
};

const MIN_ACTIVITY_MINUTES = 5;
const MAX_ACTIVITY_MINUTES = 12 * 60;

const defaultSettings = {
  dailyTargetMinutes: 8 * 60,
  workingDaysPerWeek: 5 as const,
  theme: 'system' as const,
  gapReminderMinutes: 60,
  backupDir: null as string | null,
  autoStart: false,
  trayEnabled: true,
  hotkeyEnabled: true,
};

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;
}

function copySidecars(sourceDb: string, targetBase: string) {
  const wal = `${sourceDb}-wal`;
  const shm = `${sourceDb}-shm`;
  if (fs.existsSync(wal)) fs.copyFileSync(wal, `${targetBase}-wal`);
  if (fs.existsSync(shm)) fs.copyFileSync(shm, `${targetBase}-shm`);
}

function createMigrationBackup(dbPath: string) {
  if (!fs.existsSync(dbPath)) return;
  const backupDir = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `taskdesk-migration-${timestamp()}.sqlite`);
  fs.copyFileSync(dbPath, backupPath);
  copySidecars(dbPath, backupPath);
}

const migrations = [
  {
    version: 1,
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0);

        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activities (
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
          FOREIGN KEY (client_id) REFERENCES clients(id)
        );

        CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
        CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id);
      `);
    },
  },
  {
    version: 2,
    up: (db: Database.Database) => {
      db.exec(`
        ALTER TABLE activities ADD COLUMN status TEXT NOT NULL DEFAULT 'bozza';
        ALTER TABLE clients ADD COLUMN last_used_at TEXT;

        CREATE TABLE IF NOT EXISTS activity_history (
          id TEXT PRIMARY KEY,
          activity_id TEXT NOT NULL,
          summary TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          FOREIGN KEY (activity_id) REFERENCES activities(id)
        );

        CREATE INDEX IF NOT EXISTS idx_activity_history_activity ON activity_history(activity_id);
        CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 3,
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_templates (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          client_name TEXT,
          description TEXT,
          minutes INTEGER NOT NULL,
          reference_verbale TEXT,
          resource_icon TEXT,
          tags TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          used_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_activity_templates_last_used ON activity_templates(last_used_at);
      `);
    },
  },
];

export function openDb() {
  const dbPath = path.join(app.getPath('userData'), 'taskdesk.sqlite');
  const hadDb = fs.existsSync(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL);');
  db.exec('INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0);');
  const currentVersion = db.prepare('SELECT version FROM schema_version WHERE id = 1').get() as { version: number } | undefined;
  const version = currentVersion?.version ?? 0;
  const targetVersion = migrations[migrations.length - 1]?.version ?? version;
  if (hadDb && version < targetVersion) {
    createMigrationBackup(dbPath);
  }
  for (const migration of migrations) {
    if (migration.version > version) {
      const tx = db.transaction(() => {
        migration.up(db);
        db.prepare('UPDATE schema_version SET version = ? WHERE id = 1').run(migration.version);
      });
      tx();
    }
  }
  ensureDefaultSettings(db);
  return db;
}

function normalizeTags(tags?: string[]) {
  if (!tags || tags.length === 0) return null;
  return tags.map((tag) => tag.trim()).filter(Boolean).join(',');
}

function parseTags(tags: string | null) {
  if (!tags) return [];
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function normalizeClientName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function touchClient(db: Database.Database, clientId: string) {
  db.prepare('UPDATE clients SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), clientId);
}

function ensureDefaultSettings(db: Database.Database) {
  const existing = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const map = new Map(existing.map((row) => [row.key, row.value]));
  const insert = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');

  const defaults: Record<string, string> = {
    daily_target_minutes: String(defaultSettings.dailyTargetMinutes),
    working_days_per_week: String(defaultSettings.workingDaysPerWeek),
    theme: defaultSettings.theme,
    gap_reminder_minutes: String(defaultSettings.gapReminderMinutes),
    backup_dir: '',
    auto_start: defaultSettings.autoStart ? '1' : '0',
    tray_enabled: defaultSettings.trayEnabled ? '1' : '0',
    hotkey_enabled: defaultSettings.hotkeyEnabled ? '1' : '0',
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!map.has(key)) {
      insert.run(key, value);
    }
  });
}

function buildChangeSummary(previous: Activity, next: ActivityInput & { status: ActivityStatus; inGestore: boolean }) {
  const changes: string[] = [];
  if (previous.title !== next.title) changes.push('titolo');
  if ((previous.description ?? '') !== (next.description ?? '')) changes.push('descrizione');
  if (previous.minutes !== next.minutes) changes.push('minuti');
  if ((previous.referenceVerbale ?? '') !== (next.referenceVerbale ?? '')) changes.push('rif verbale');
  if ((previous.resourceIcon ?? '') !== (next.resourceIcon ?? '')) changes.push('risorsa');
  if (previous.status !== next.status) changes.push(`stato ${previous.status}->${next.status}`);
  if (previous.inGestore !== next.inGestore) changes.push(`gestore ${previous.inGestore ? 'SI' : 'NO'}->${next.inGestore ? 'SI' : 'NO'}`);
  if (previous.verbaleDone !== next.verbaleDone) changes.push('verbale');
  if (changes.length === 0) return null;
  return `Aggiornato: ${changes.join(', ')}`;
}

function assertValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Data non valida. Usa il formato YYYY-MM-DD.');
  }
}

function assertValidTitle(value: string) {
  if (!value || value.trim().length === 0) {
    throw new Error('Titolo obbligatorio.');
  }
}

function assertValidMinutes(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('Minuti non validi.');
  }
  if (!Number.isInteger(value)) {
    throw new Error('Minuti devono essere un numero intero.');
  }
  if (value < MIN_ACTIVITY_MINUTES || value > MAX_ACTIVITY_MINUTES) {
    throw new Error(`Minuti devono essere tra ${MIN_ACTIVITY_MINUTES} e ${MAX_ACTIVITY_MINUTES}.`);
  }
}

export function upsertClient(db: Database.Database, name: string) {
  const now = new Date().toISOString();
  const normalized = normalizeClientName(name);
  const existing = db
    .prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt, last_used_at as lastUsedAt FROM clients WHERE lower(name) = lower(?)')
    .get(normalized) as Client | undefined;
  if (existing) {
    db.prepare('UPDATE clients SET updated_at = ?, last_used_at = ? WHERE id = ?').run(now, now, existing.id);
    return { ...existing, updatedAt: now, lastUsedAt: now };
  }

  const id = randomUUID();
  db.prepare('INSERT INTO clients (id, name, created_at, updated_at, last_used_at) VALUES (?, ?, ?, ?, ?)').run(id, normalized, now, now, now);
  return { id, name: normalized, createdAt: now, updatedAt: now, lastUsedAt: now };
}

export function listClients(db: Database.Database) {
  return db
    .prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt, last_used_at as lastUsedAt FROM clients ORDER BY name')
    .all() as Client[];
}

export function searchClients(db: Database.Database, term: string) {
  return db
    .prepare(
      'SELECT id, name, created_at as createdAt, updated_at as updatedAt, last_used_at as lastUsedAt FROM clients WHERE name LIKE ? ORDER BY name LIMIT 20'
    )
    .all(`%${term}%`) as Client[];
}

export function listRecentClients(db: Database.Database) {
  return db
    .prepare(
      'SELECT id, name, created_at as createdAt, updated_at as updatedAt, last_used_at as lastUsedAt FROM clients WHERE last_used_at IS NOT NULL ORDER BY last_used_at DESC LIMIT 8'
    )
    .all() as Client[];
}

export function listTemplates(db: Database.Database) {
  const rows = db
    .prepare(
      `SELECT id, title, client_name as clientName, description, minutes, reference_verbale as referenceVerbale, resource_icon as resourceIcon,
        tags, created_at as createdAt, updated_at as updatedAt, used_count as usedCount, last_used_at as lastUsedAt
      FROM activity_templates
      ORDER BY COALESCE(last_used_at, updated_at) DESC, title ASC`
    )
    .all() as (Omit<ActivityTemplate, 'tags'> & { tags: string | null })[];

  return rows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
  }));
}

export function createTemplate(db: Database.Database, input: ActivityInput) {
  const now = new Date().toISOString();
  assertValidTitle(input.title);
  assertValidMinutes(input.minutes);
  const id = randomUUID();
  const clientName = input.clientName ? normalizeClientName(input.clientName) : null;

  db.prepare(
    `INSERT INTO activity_templates (
      id, title, client_name, description, minutes, reference_verbale, resource_icon, tags, created_at, updated_at, used_count, last_used_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`
  ).run(
    id,
    input.title,
    clientName,
    input.description ?? null,
    input.minutes,
    input.referenceVerbale ?? null,
    input.resourceIcon ?? null,
    normalizeTags(input.tags),
    now,
    now
  );

  return getTemplateById(db, id);
}

export function deleteTemplate(db: Database.Database, id: string) {
  db.prepare('DELETE FROM activity_templates WHERE id = ?').run(id);
  return true;
}

export function useTemplate(db: Database.Database, id: string) {
  const now = new Date().toISOString();
  db.prepare('UPDATE activity_templates SET used_count = used_count + 1, last_used_at = ? WHERE id = ?').run(now, id);
  return getTemplateById(db, id);
}

export function createActivity(db: Database.Database, input: ActivityInput) {
  const now = new Date().toISOString();
  assertValidDate(input.date);
  assertValidTitle(input.title);
  assertValidMinutes(input.minutes);
  let clientId: string | null = null;
  if (input.clientName) {
    clientId = upsertClient(db, input.clientName).id;
  }
  const status: ActivityStatus = input.status ?? (input.inGestore ? 'inserita' : 'bozza');
  const inGestore = input.inGestore ?? status === 'inserita';

  const id = randomUUID();
  db.prepare(
    `INSERT INTO activities (
      id, date, client_id, title, description, minutes, reference_verbale, resource_icon, tags, status, in_gestore, verbale_done, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.date,
    clientId,
    input.title,
    input.description ?? null,
    input.minutes,
    input.referenceVerbale ?? null,
    input.resourceIcon ?? null,
    normalizeTags(input.tags),
    status,
    inGestore ? 1 : 0,
    input.verbaleDone ? 1 : 0,
    now,
    now
  );

  return getActivityById(db, id);
}

export function updateActivity(db: Database.Database, id: string, input: Partial<ActivityInput>) {
  const existing = getActivityById(db, id);
  if (!existing) return null;

  if (typeof input.date === 'string') assertValidDate(input.date);
  if (typeof input.title === 'string') assertValidTitle(input.title);
  if (typeof input.minutes === 'number') assertValidMinutes(input.minutes);

  let clientId = existing.clientId;
  if (input.clientName) {
    clientId = upsertClient(db, input.clientName).id;
  }

  const nextStatus: ActivityStatus =
    input.status ?? (input.inGestore ? 'inserita' : existing.status ?? 'bozza');
  const nextInGestore = input.inGestore ?? (input.status ? input.status === 'inserita' : existing.inGestore);

  const updated = {
    date: input.date ?? existing.date,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    minutes: input.minutes ?? existing.minutes,
    referenceVerbale: input.referenceVerbale ?? existing.referenceVerbale,
    resourceIcon: input.resourceIcon ?? existing.resourceIcon,
    tags: input.tags ?? existing.tags,
    status: nextStatus,
    inGestore: nextInGestore,
    verbaleDone: input.verbaleDone ?? existing.verbaleDone,
  };

  db.prepare(
    `UPDATE activities SET
      date = ?,
      client_id = ?,
      title = ?,
      description = ?,
      minutes = ?,
      reference_verbale = ?,
      resource_icon = ?,
      tags = ?,
      status = ?,
      in_gestore = ?,
      verbale_done = ?,
      updated_at = ?
    WHERE id = ?`
  ).run(
    updated.date,
    clientId,
    updated.title,
    updated.description ?? null,
    updated.minutes,
    updated.referenceVerbale ?? null,
    updated.resourceIcon ?? null,
    normalizeTags(updated.tags),
    updated.status,
    updated.inGestore ? 1 : 0,
    updated.verbaleDone ? 1 : 0,
    new Date().toISOString(),
    id
  );

  const updatedInput: ActivityInput & { status: ActivityStatus; inGestore: boolean } = {
    ...updated,
    description: updated.description ?? undefined,
    referenceVerbale: updated.referenceVerbale ?? undefined,
    resourceIcon: updated.resourceIcon ?? undefined,
  };

  const summary = buildChangeSummary(existing, updatedInput);
  if (summary) {
    db.prepare('INSERT INTO activity_history (id, activity_id, summary, changed_at) VALUES (?, ?, ?, ?)').run(
      randomUUID(),
      id,
      summary,
      new Date().toISOString()
    );
  }

  return getActivityById(db, id);
}

export function deleteActivity(db: Database.Database, id: string) {
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  return true;
}

export function listActivitiesByDate(db: Database.Database, date: string) {
  const rows = db
    .prepare(
      `SELECT a.id, a.date, a.client_id as clientId, c.name as clientName, a.title, a.description, a.minutes,
        a.reference_verbale as referenceVerbale, a.resource_icon as resourceIcon, a.tags, a.status as status, a.in_gestore as inGestore,
        a.verbale_done as verbaleDone, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date = ?
      ORDER BY a.created_at ASC`
    )
    .all(date) as (Omit<Activity, 'tags' | 'inGestore' | 'verbaleDone' | 'status'> & {
      tags: string | null;
      status: string | null;
      inGestore: number;
      verbaleDone: number;
    })[];

  return rows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
    status: row.status as ActivityStatus,
    inGestore: row.inGestore === 1,
    verbaleDone: row.verbaleDone === 1,
  }));
}

export function getDailySummary(db: Database.Database, date: string) {
  const row = db.prepare('SELECT SUM(minutes) as totalMinutes, COUNT(*) as totalEntries FROM activities WHERE date = ?').get(date) as {
    totalMinutes: number | null;
    totalEntries: number;
  };
  return {
    date,
    totalMinutes: row?.totalMinutes ?? 0,
    totalEntries: row?.totalEntries ?? 0,
  };
}

export function getWeeklySummary(db: Database.Database, startDate: string, endDate: string) {
  const row = db
    .prepare('SELECT SUM(minutes) as totalMinutes, COUNT(*) as totalEntries FROM activities WHERE date BETWEEN ? AND ?')
    .get(startDate, endDate) as { totalMinutes: number | null; totalEntries: number };

  const byDay = db
    .prepare(
      `SELECT date, SUM(minutes) as totalMinutes, COUNT(*) as totalEntries
      FROM activities
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC`
    )
    .all(startDate, endDate) as { date: string; totalMinutes: number | null; totalEntries: number }[];

  const byClient = db
    .prepare(
      `SELECT c.name as clientName, SUM(a.minutes) as totalMinutes, COUNT(*) as totalEntries
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date BETWEEN ? AND ?
      GROUP BY c.name
      ORDER BY totalMinutes DESC`
    )
    .all(startDate, endDate) as { clientName: string | null; totalMinutes: number | null; totalEntries: number }[];

  const groups = db
    .prepare(
      `SELECT c.name as clientName,
        CASE
          WHEN a.reference_verbale IS NOT NULL AND a.reference_verbale != '' THEN a.reference_verbale
          ELSE a.title
        END as label,
        SUM(a.minutes) as totalMinutes,
        COUNT(*) as totalEntries
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date BETWEEN ? AND ?
      GROUP BY c.name, label
      ORDER BY totalMinutes DESC`
    )
    .all(startDate, endDate) as { clientName: string | null; label: string; totalMinutes: number | null; totalEntries: number }[];

  return {
    startDate,
    endDate,
    totalMinutes: row?.totalMinutes ?? 0,
    totalEntries: row?.totalEntries ?? 0,
    byDay: byDay.map((item) => ({
      date: item.date,
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
    byClient: byClient.map((item) => ({
      clientName: item.clientName ?? 'Nessun cliente',
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
    groups: groups.map((item) => ({
      clientName: item.clientName ?? 'Nessun cliente',
      label: item.label,
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
  };
}

export function getMonthlySummary(db: Database.Database, month: string) {
  const row = db
    .prepare('SELECT SUM(minutes) as totalMinutes, COUNT(*) as totalEntries FROM activities WHERE date LIKE ?')
    .get(`${month}-%`) as { totalMinutes: number | null; totalEntries: number };

  const byDay = db
    .prepare(
      `SELECT date, SUM(minutes) as totalMinutes, COUNT(*) as totalEntries
      FROM activities
      WHERE date LIKE ?
      GROUP BY date
      ORDER BY date ASC`
    )
    .all(`${month}-%`) as { date: string; totalMinutes: number | null; totalEntries: number }[];

  const byClient = db
    .prepare(
      `SELECT c.name as clientName, SUM(a.minutes) as totalMinutes, COUNT(*) as totalEntries
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date LIKE ?
      GROUP BY c.name
      ORDER BY totalMinutes DESC`
    )
    .all(`${month}-%`) as { clientName: string | null; totalMinutes: number | null; totalEntries: number }[];

  const groups = db
    .prepare(
      `SELECT c.name as clientName,
        CASE
          WHEN a.reference_verbale IS NOT NULL AND a.reference_verbale != '' THEN a.reference_verbale
          ELSE a.title
        END as label,
        SUM(a.minutes) as totalMinutes,
        COUNT(*) as totalEntries
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date LIKE ?
      GROUP BY c.name, label
      ORDER BY totalMinutes DESC`
    )
    .all(`${month}-%`) as { clientName: string | null; label: string; totalMinutes: number | null; totalEntries: number }[];

  return {
    month,
    totalMinutes: row?.totalMinutes ?? 0,
    totalEntries: row?.totalEntries ?? 0,
    byDay: byDay.map((item) => ({
      date: item.date,
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
    byClient: byClient.map((item) => ({
      clientName: item.clientName ?? 'Nessun cliente',
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
    groups: groups.map((item) => ({
      clientName: item.clientName ?? 'Nessun cliente',
      label: item.label,
      totalMinutes: item.totalMinutes ?? 0,
      totalEntries: item.totalEntries ?? 0,
    })),
  };
}

export function listActivityHistory(db: Database.Database, activityId: string, limit = 5) {
  return db
    .prepare(
      'SELECT id, activity_id as activityId, summary, changed_at as changedAt FROM activity_history WHERE activity_id = ? ORDER BY changed_at DESC LIMIT ?'
    )
    .all(activityId, limit) as ActivityHistory[];
}

export function searchActivities(
  db: Database.Database,
  filters: {
    text?: string;
    client?: string;
    status?: ActivityStatus | 'all';
    startDate?: string;
    endDate?: string;
    onlyNotInserted?: boolean;
  }
) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.startDate) {
    clauses.push('a.date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push('a.date <= ?');
    params.push(filters.endDate);
  }
  if (filters.text) {
    clauses.push('(a.title LIKE ? OR a.description LIKE ? OR a.reference_verbale LIKE ?)');
    const like = `%${filters.text}%`;
    params.push(like, like, like);
  }
  if (filters.client) {
    clauses.push('c.name LIKE ?');
    params.push(`%${filters.client}%`);
  }
  if (filters.status && filters.status !== 'all') {
    clauses.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.onlyNotInserted) {
    clauses.push('a.in_gestore = 0');
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT a.id, a.date, a.client_id as clientId, c.name as clientName, a.title, a.description, a.minutes,
        a.reference_verbale as referenceVerbale, a.resource_icon as resourceIcon, a.tags, a.status as status, a.in_gestore as inGestore,
        a.verbale_done as verbaleDone, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      ${whereClause}
      ORDER BY a.date DESC, a.created_at DESC
      LIMIT 500`
    )
    .all(...params) as (Omit<Activity, 'tags' | 'inGestore' | 'verbaleDone' | 'status'> & {
    tags: string | null;
    status: string | null;
    inGestore: number;
    verbaleDone: number;
  })[];

  return rows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
    status: (row.status ?? 'bozza') as ActivityStatus,
    inGestore: row.inGestore === 1,
    verbaleDone: row.verbaleDone === 1,
  }));
}

function formatDateForDb(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDurationPatterns(db: Database.Database, days = 45) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = db
    .prepare(
      `SELECT minutes, COUNT(*) as count
      FROM activities
      WHERE date >= ?
      GROUP BY minutes
      ORDER BY count DESC`
    )
    .all(formatDateForDb(since)) as { minutes: number; count: number }[];

  return rows.map((row) => row.minutes);
}

export function getSettings(db: Database.Database): AppSettings {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    dailyTargetMinutes: Number(map.get('daily_target_minutes') ?? defaultSettings.dailyTargetMinutes),
    workingDaysPerWeek: Number(map.get('working_days_per_week') ?? defaultSettings.workingDaysPerWeek) as 5 | 6 | 7,
    theme: (map.get('theme') as AppSettings['theme']) ?? defaultSettings.theme,
    gapReminderMinutes: Number(map.get('gap_reminder_minutes') ?? defaultSettings.gapReminderMinutes),
    backupDir: map.get('backup_dir') ? (map.get('backup_dir') as string) : null,
    autoStart: (map.get('auto_start') ?? '0') === '1',
    trayEnabled: (map.get('tray_enabled') ?? '1') === '1',
    hotkeyEnabled: (map.get('hotkey_enabled') ?? '1') === '1',
  };
}

export function setSettings(db: Database.Database, partial: Partial<AppSettings>) {
  const existing = getSettings(db);
  const merged: AppSettings = {
    dailyTargetMinutes: partial.dailyTargetMinutes ?? existing.dailyTargetMinutes,
    workingDaysPerWeek: partial.workingDaysPerWeek ?? existing.workingDaysPerWeek,
    theme: partial.theme ?? existing.theme,
    gapReminderMinutes: partial.gapReminderMinutes ?? existing.gapReminderMinutes,
    backupDir: partial.backupDir ?? existing.backupDir,
    autoStart: partial.autoStart ?? existing.autoStart,
    trayEnabled: partial.trayEnabled ?? existing.trayEnabled,
    hotkeyEnabled: partial.hotkeyEnabled ?? existing.hotkeyEnabled,
  };

  const update = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  update.run('daily_target_minutes', String(merged.dailyTargetMinutes));
  update.run('working_days_per_week', String(merged.workingDaysPerWeek));
  update.run('theme', merged.theme);
  update.run('gap_reminder_minutes', String(merged.gapReminderMinutes));
  update.run('backup_dir', merged.backupDir ?? '');
  update.run('auto_start', merged.autoStart ? '1' : '0');
  update.run('tray_enabled', merged.trayEnabled ? '1' : '0');
  update.run('hotkey_enabled', merged.hotkeyEnabled ? '1' : '0');

  return merged;
}

function getActivityById(db: Database.Database, id: string) {
  const row = db
    .prepare(
      `SELECT a.id, a.date, a.client_id as clientId, c.name as clientName, a.title, a.description, a.minutes,
        a.reference_verbale as referenceVerbale, a.resource_icon as resourceIcon, a.tags, a.status as status, a.in_gestore as inGestore,
        a.verbale_done as verbaleDone, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.id = ?`
    )
    .get(id) as (Omit<Activity, 'tags' | 'inGestore' | 'verbaleDone' | 'status'> & {
      tags: string | null;
      status: string | null;
      inGestore: number;
      verbaleDone: number;
    }) | undefined;

  if (!row) return null;
  return {
    ...row,
    tags: parseTags(row.tags),
    status: (row.status ?? 'bozza') as ActivityStatus,
    inGestore: row.inGestore === 1,
    verbaleDone: row.verbaleDone === 1,
  };
}

function getTemplateById(db: Database.Database, id: string) {
  const row = db
    .prepare(
      `SELECT id, title, client_name as clientName, description, minutes, reference_verbale as referenceVerbale, resource_icon as resourceIcon,
        tags, created_at as createdAt, updated_at as updatedAt, used_count as usedCount, last_used_at as lastUsedAt
      FROM activity_templates
      WHERE id = ?`
    )
    .get(id) as (Omit<ActivityTemplate, 'tags'> & { tags: string | null }) | undefined;

  if (!row) return null;
  return {
    ...row,
    tags: parseTags(row.tags),
  };
}
