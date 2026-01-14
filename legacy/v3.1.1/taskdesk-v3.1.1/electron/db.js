const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

let dbInstance;

const ISO_DATE = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function databasePath() {
  const userData = app.getPath('userData');
  const dir = path.join(userData, 'storage');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'taskdesk.sqlite');
}

function init() {
  if (dbInstance) {
    return dbInstance;
  }
  const dbPath = databasePath();
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  runMigrations();
  return dbInstance;
}

function runMigrations() {
  const db = dbInstance;
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      vat_number TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      type TEXT DEFAULT 'general',
      billable INTEGER DEFAULT 0,
      tags TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT NOT NULL,
      event TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date);
    CREATE INDEX IF NOT EXISTS idx_activities_client ON activities (client_id);
    CREATE INDEX IF NOT EXISTS idx_activities_status ON activities (status);
  `);
}

function ensure() {
  if (!dbInstance) {
    throw new Error('Database not initialised. Call init() after app ready.');
  }
  return dbInstance;
}

function isoNow() {
  return new Date().toISOString();
}

function computeDurationMinutes({ start_time, end_time, duration_minutes }) {
  if (duration_minutes && Number.isFinite(duration_minutes)) {
    const parsed = Number(duration_minutes);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (start_time && end_time) {
    const [sh, sm = 0] = start_time.split(':').map(Number);
    const [eh, em = 0] = end_time.split(':').map(Number);
    if ([sh, sm, eh, em].every((value) => Number.isFinite(value))) {
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      const diff = end - start;
      return diff > 0 ? diff : 0;
    }
  }
  return 0;
}

function parseJSON(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function formatActivityRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id || null,
    clientName: row.client_name || null,
    title: row.title,
    description: row.description || '',
    date: row.date,
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    durationMinutes: row.duration_minutes || 0,
    status: row.status,
    type: row.type,
    billable: row.billable === 1,
    tags: parseJSON(row.tags, []),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createActivity(input) {
  const db = ensure();
  const id = crypto.randomUUID();
  const now = isoNow();
  const durationMinutes = computeDurationMinutes({
    start_time: input.startTime,
    end_time: input.endTime,
    duration_minutes: input.durationMinutes,
  });
  const tags = Array.isArray(input.tags) ? JSON.stringify(input.tags) : JSON.stringify([]);

  const stmt = db.prepare(`
    INSERT INTO activities (
      id, client_id, title, description, date, start_time, end_time, duration_minutes,
      status, type, billable, tags, notes, created_at, updated_at
    ) VALUES (
      @id, @clientId, @title, @description, @date, @startTime, @endTime, @durationMinutes,
      @status, @type, @billable, @tags, @notes, @createdAt, @updatedAt
    )
  `);

  stmt.run({
    id,
    clientId: input.clientId || null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    date: input.date,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    durationMinutes,
    status: input.status || 'planned',
    type: input.type || 'general',
    billable: input.billable ? 1 : 0,
    tags,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });

  recordActivityEvent(id, 'created', { source: input.source || 'app' });
  return getActivity(id);
}

function updateActivity(id, input) {
  const db = ensure();
  const now = isoNow();
  const existing = getActivity(id);
  if (!existing) {
    throw new Error('Activity not found');
  }

  const durationMinutes = computeDurationMinutes({
    start_time: input.startTime ?? existing.startTime,
    end_time: input.endTime ?? existing.endTime,
    duration_minutes: input.durationMinutes ?? existing.durationMinutes,
  });
  const tags = Array.isArray(input.tags)
    ? JSON.stringify(input.tags)
    : JSON.stringify(existing.tags || []);

  const stmt = db.prepare(`
    UPDATE activities
    SET
      client_id = @clientId,
      title = @title,
      description = @description,
      date = @date,
      start_time = @startTime,
      end_time = @endTime,
      duration_minutes = @durationMinutes,
      status = @status,
      type = @type,
      billable = @billable,
      tags = @tags,
      notes = @notes,
      updated_at = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    id,
    clientId: input.clientId ?? existing.clientId ?? null,
    title: input.title?.trim() || existing.title,
    description: input.description !== undefined ? input.description?.trim() || null : existing.description || null,
    date: input.date || existing.date,
    startTime: input.startTime !== undefined ? input.startTime || null : existing.startTime || null,
    endTime: input.endTime !== undefined ? input.endTime || null : existing.endTime || null,
    durationMinutes,
    status: input.status || existing.status,
    type: input.type || existing.type,
    billable: input.billable !== undefined ? (input.billable ? 1 : 0) : existing.billable ? 1 : 0,
    tags,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes || null,
    updatedAt: now,
  });

  recordActivityEvent(id, 'updated', { fields: Object.keys(input) });
  return getActivity(id);
}

function removeActivity(id) {
  const db = ensure();
  const stmt = db.prepare('DELETE FROM activities WHERE id = ?');
  stmt.run(id);
}

function getActivity(id) {
  const db = ensure();
  const stmt = db.prepare(`
    SELECT a.*, c.name AS client_name
    FROM activities a
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.id = ?
  `);
  const row = stmt.get(id);
  return formatActivityRow(row);
}

function listActivities(params = {}) {
  const db = ensure();
  const filters = [];
  const bind = {};

  if (params.startDate) {
    filters.push('a.date >= @startDate');
    bind.startDate = params.startDate;
  }

  if (params.endDate) {
    filters.push('a.date <= @endDate');
    bind.endDate = params.endDate;
  }

  if (params.clientId) {
    filters.push('a.client_id = @clientId');
    bind.clientId = params.clientId;
  }

  if (params.status && params.status.length) {
    filters.push(`a.status IN (${params.status.map((_, idx) => `@status${idx}`).join(', ')})`);
    params.status.forEach((value, idx) => {
      bind[`status${idx}`] = value;
    });
  }

  if (params.search) {
    filters.push('(a.title LIKE @search OR a.description LIKE @search OR c.name LIKE @search)');
    bind.search = `%${params.search}%`;
  }

  let query = `
    SELECT a.*, c.name AS client_name
    FROM activities a
    LEFT JOIN clients c ON c.id = a.client_id
  `;

  if (filters.length) {
    query += ` WHERE ${filters.join(' AND ')}`;
  }

  query += ' ORDER BY a.date DESC, a.start_time DESC, a.created_at DESC';

  if (params.limit) {
    query += ' LIMIT @limit';
    bind.limit = params.limit;
  }

  const rows = db.prepare(query).all(bind);
  return rows.map(formatActivityRow);
}

function listActivitiesForMonth(month) {
  const { start, end } = monthBoundaries(month);
  return listActivities({ startDate: start, endDate: end });
}

function recordActivityEvent(activityId, event, payload = {}) {
  const db = ensure();
  const stmt = db.prepare(`
    INSERT INTO activity_events (activity_id, event, payload, created_at)
    VALUES (@activityId, @event, @payload, @createdAt)
  `);

  stmt.run({
    activityId,
    event,
    payload: JSON.stringify(payload),
    createdAt: isoNow(),
  });
}

function listActivityEvents(activityId) {
  const db = ensure();
  const stmt = db.prepare(`
    SELECT id, activity_id, event, payload, created_at
    FROM activity_events
    WHERE activity_id = ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(activityId);
  return rows.map((row) => ({
    id: row.id,
    activityId: row.activity_id,
    event: row.event,
    payload: parseJSON(row.payload, {}),
    createdAt: row.created_at,
  }));
}

function listClients(params = {}) {
  const db = ensure();
  const filters = [];
  const bind = {};

  if (params.search) {
    filters.push('(name LIKE @search OR contact_name LIKE @search)');
    bind.search = `%${params.search}%`;
  }

  if (params.active !== undefined && params.active !== 'all') {
    filters.push('active = @active');
    bind.active = params.active ? 1 : 0;
  }

  if (params.category) {
    filters.push('category = @category');
    bind.category = params.category;
  }

  let query = 'SELECT * FROM clients';
  if (filters.length) {
    query += ` WHERE ${filters.join(' AND ')}`;
  }
  query += ' ORDER BY name COLLATE NOCASE ASC';

  const rows = db.prepare(query).all(bind);
  return rows.map(formatClientRow);
}

function formatClientRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || '',
    vatNumber: row.vat_number || '',
    contactName: row.contact_name || '',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    notes: row.notes || '',
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getClient(id) {
  const db = ensure();
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
  const row = stmt.get(id);
  return row ? formatClientRow(row) : null;
}

function getClientByName(name) {
  const db = ensure();
  const stmt = db.prepare('SELECT * FROM clients WHERE name = ?');
  const row = stmt.get(name);
  return row ? formatClientRow(row) : null;
}

function createClient(input) {
  const db = ensure();
  const id = crypto.randomUUID();
  const now = isoNow();

  const stmt = db.prepare(`
    INSERT INTO clients (
      id, name, category, vat_number, contact_name, contact_email, contact_phone,
      notes, active, created_at, updated_at
    ) VALUES (
      @id, @name, @category, @vat, @contactName, @contactEmail, @contactPhone,
      @notes, @active, @createdAt, @updatedAt
    )
  `);

  stmt.run({
    id,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    vat: input.vatNumber?.trim() || null,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
    notes: input.notes?.trim() || null,
    active: input.active === false ? 0 : 1,
    createdAt: now,
    updatedAt: now,
  });

  return getClient(id);
}

function updateClient(id, input) {
  const db = ensure();
  const existing = getClient(id);
  if (!existing) {
    throw new Error('Client not found');
  }
  const now = isoNow();

  const stmt = db.prepare(`
    UPDATE clients
    SET
      name = @name,
      category = @category,
      vat_number = @vat,
      contact_name = @contactName,
      contact_email = @contactEmail,
      contact_phone = @contactPhone,
      notes = @notes,
      active = @active,
      updated_at = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    id,
    name: input.name?.trim() || existing.name,
    category: input.category !== undefined ? input.category?.trim() || null : existing.category || null,
    vat: input.vatNumber !== undefined ? input.vatNumber?.trim() || null : existing.vatNumber || null,
    contactName: input.contactName !== undefined ? input.contactName?.trim() || null : existing.contactName || null,
    contactEmail: input.contactEmail !== undefined ? input.contactEmail?.trim() || null : existing.contactEmail || null,
    contactPhone: input.contactPhone !== undefined ? input.contactPhone?.trim() || null : existing.contactPhone || null,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes || null,
    active: input.active !== undefined ? (input.active ? 1 : 0) : existing.active ? 1 : 0,
    updatedAt: now,
  });

  return getClient(id);
}

function removeClient(id) {
  const db = ensure();
  const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
  stmt.run(id);
}

function autocompleteClients(term, limit = 8) {
  const db = ensure();
  const stmt = db.prepare(`
    SELECT id, name
    FROM clients
    WHERE name LIKE @term
    ORDER BY name COLLATE NOCASE ASC
    LIMIT @limit
  `);
  return stmt.all({ term: `%${term}%`, limit });
}

function setSetting(key, value) {
  const db = ensure();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run({ key, value: JSON.stringify(value) });
}

function getSetting(key) {
  const db = ensure();
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key);
  return row ? parseJSON(row.value, null) : null;
}

function monthBoundaries(month) {
  const [year, monthStr] = month.split('-').map(Number);
  if (!year || !monthStr) {
    throw new Error(`Invalid month supplied: ${month}`);
  }
  const startDate = new Date(Date.UTC(year, monthStr - 1, 1));
  const start = ISO_DATE.format(startDate);
  const endDate = new Date(Date.UTC(year, monthStr, 0));
  const end = ISO_DATE.format(endDate);
  return { start, end };
}

function getDailySnapshot(date) {
  const db = ensure();
  const activities = listActivities({ startDate: date, endDate: date });
  const totalMinutes = activities.reduce((acc, item) => acc + (item.durationMinutes || 0), 0);
  const billableMinutes = activities.reduce(
    (acc, item) => acc + (item.billable ? item.durationMinutes || 0 : 0),
    0,
  );
  const clients = new Set(activities.filter((item) => item.clientId).map((item) => item.clientId));
  return {
    date,
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
    totalActivities: activities.length,
    uniqueClients: clients.size,
    activities,
  };
}

function getMonthlySummary(month) {
  const { start, end } = monthBoundaries(month);
  const activities = listActivities({ startDate: start, endDate: end });

  const totalMinutes = activities.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const billableMinutes = activities
    .filter((item) => item.billable)
    .reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const clients = new Set(activities.filter((item) => item.clientId).map((item) => item.clientId));

  const perDayMap = new Map();
  const typeMap = new Map();
  const tagMap = new Map();
  const clientMap = new Map();

  activities.forEach((activity) => {
    const minutes = activity.durationMinutes || 0;
    const dateEntry =
      perDayMap.get(activity.date) ||
      { date: activity.date, totalMinutes: 0, billableMinutes: 0, activityCount: 0 };
    dateEntry.totalMinutes += minutes;
    dateEntry.billableMinutes += activity.billable ? minutes : 0;
    dateEntry.activityCount += 1;
    perDayMap.set(activity.date, dateEntry);

    const typeEntry = (typeMap.get(activity.type) || { type: activity.type, totalMinutes: 0, count: 0 });
    typeEntry.totalMinutes += minutes;
    typeEntry.count += 1;
    typeMap.set(activity.type, typeEntry);

    (activity.tags || []).forEach((tag) => {
      const tagKey = tag.toLowerCase();
      const tagEntry = tagMap.get(tagKey) || { tag, totalMinutes: 0, count: 0 };
      tagEntry.totalMinutes += minutes;
      tagEntry.count += 1;
      tagMap.set(tagKey, tagEntry);
    });

    if (activity.clientId) {
      const clientEntry =
        clientMap.get(activity.clientId) ||
        { clientId: activity.clientId, clientName: activity.clientName, totalMinutes: 0, count: 0 };
      clientEntry.totalMinutes += minutes;
      clientEntry.count += 1;
      clientMap.set(activity.clientId, clientEntry);
    }
  });

  return {
    month,
    range: { start, end },
    totals: {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      totalActivities: activities.length,
      uniqueClients: clients.size,
      activeDays: perDayMap.size,
      averageDailyMinutes: perDayMap.size ? Math.round(totalMinutes / perDayMap.size) : 0,
    },
    perDay: Array.from(perDayMap.values()).sort((a, b) => (a.date > b.date ? 1 : -1)),
    byType: Array.from(typeMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byTag: Array.from(tagMap.values())
      .filter((entry) => entry.tag)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 20),
    topClients: Array.from(clientMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 12),
    activities,
  };
}

module.exports = {
  init,
  ensure,
  databasePath,
  monthBoundaries,
  // Activity API
  listActivities,
  listActivitiesForMonth,
  getActivity,
  createActivity,
  updateActivity,
  removeActivity,
  getDailySnapshot,
  getMonthlySummary,
  listActivityEvents,
  // Client API
  listClients,
  getClient,
  getClientByName,
  createClient,
  updateClient,
  removeClient,
  autocompleteClients,
  // Settings
  setSetting,
  getSetting,
};

