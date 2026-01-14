import Database from 'better-sqlite3';
import path from 'node:path';
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
  inGestore?: boolean;
  verbaleDone?: boolean;
};

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
};

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
];

export function openDb() {
  const dbPath = path.join(app.getPath('userData'), 'taskdesk.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL);');
  db.exec('INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0);');
  const currentVersion = db.prepare('SELECT version FROM schema_version WHERE id = 1').get() as { version: number } | undefined;
  const version = currentVersion?.version ?? 0;
  for (const migration of migrations) {
    if (migration.version > version) {
      const tx = db.transaction(() => {
        migration.up(db);
        db.prepare('UPDATE schema_version SET version = ? WHERE id = 1').run(migration.version);
      });
      tx();
    }
  }
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

export function upsertClient(db: Database.Database, name: string) {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM clients WHERE name = ?').get(name) as Client | undefined;
  if (existing) return existing;

  const id = randomUUID();
  db.prepare('INSERT INTO clients (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
  return { id, name, createdAt: now, updatedAt: now };
}

export function listClients(db: Database.Database) {
  return db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM clients ORDER BY name').all() as Client[];
}

export function searchClients(db: Database.Database, term: string) {
  return db
    .prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM clients WHERE name LIKE ? ORDER BY name LIMIT 20')
    .all(`%${term}%`) as Client[];
}

export function createActivity(db: Database.Database, input: ActivityInput) {
  const now = new Date().toISOString();
  let clientId: string | null = null;
  if (input.clientName) {
    clientId = upsertClient(db, input.clientName).id;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO activities (
      id, date, client_id, title, description, minutes, reference_verbale, resource_icon, tags, in_gestore, verbale_done, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    input.inGestore ? 1 : 0,
    input.verbaleDone ? 1 : 0,
    now,
    now
  );

  return getActivityById(db, id);
}

export function updateActivity(db: Database.Database, id: string, input: Partial<ActivityInput>) {
  const existing = getActivityById(db, id);
  if (!existing) return null;

  let clientId = existing.clientId;
  if (input.clientName) {
    clientId = upsertClient(db, input.clientName).id;
  }

  const updated = {
    date: input.date ?? existing.date,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    minutes: input.minutes ?? existing.minutes,
    referenceVerbale: input.referenceVerbale ?? existing.referenceVerbale,
    resourceIcon: input.resourceIcon ?? existing.resourceIcon,
    tags: input.tags ?? existing.tags,
    inGestore: input.inGestore ?? existing.inGestore,
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
    updated.inGestore ? 1 : 0,
    updated.verbaleDone ? 1 : 0,
    new Date().toISOString(),
    id
  );

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
        a.reference_verbale as referenceVerbale, a.resource_icon as resourceIcon, a.tags, a.in_gestore as inGestore,
        a.verbale_done as verbaleDone, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date = ?
      ORDER BY a.created_at ASC`
    )
    .all(date) as (Omit<Activity, 'tags' | 'inGestore' | 'verbaleDone'> & { tags: string | null; inGestore: number; verbaleDone: number })[];

  return rows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
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

function getActivityById(db: Database.Database, id: string) {
  const row = db
    .prepare(
      `SELECT a.id, a.date, a.client_id as clientId, c.name as clientName, a.title, a.description, a.minutes,
        a.reference_verbale as referenceVerbale, a.resource_icon as resourceIcon, a.tags, a.in_gestore as inGestore,
        a.verbale_done as verbaleDone, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.id = ?`
    )
    .get(id) as (Omit<Activity, 'tags' | 'inGestore' | 'verbaleDone'> & { tags: string | null; inGestore: number; verbaleDone: number }) | undefined;

  if (!row) return null;
  return {
    ...row,
    tags: parseTags(row.tags),
    inGestore: row.inGestore === 1,
    verbaleDone: row.verbaleDone === 1,
  };
}
