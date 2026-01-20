import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import Database from 'better-sqlite3';
import { upsertClient } from './db';

function normalizeClientName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function inspectCsv(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const headers = records.length ? Object.keys(records[0]) : [];
  const sample = records.slice(0, 5).map((row) => {
    const mapped: Record<string, string> = {};
    headers.forEach((header) => {
      mapped[header] = String(row[header] ?? '');
    });
    return mapped;
  });

  return { headers, sample };
}

export function importClientsFromCsv(db: Database.Database, filePath: string, column: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  let inserted = 0;
  let skipped = 0;
  const seen = new Set<string>();

  records.forEach((row) => {
    const raw = row[column];
    if (!raw || String(raw).trim().length === 0) {
      skipped += 1;
      return;
    }
    const normalized = normalizeClientName(String(raw));
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      return;
    }
    seen.add(key);
    upsertClient(db, normalized);
    inserted += 1;
  });

  return { inserted, skipped };
}
