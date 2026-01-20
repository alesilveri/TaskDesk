import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const defaultRetention = {
  daily: 7,
  weekly: 4,
  monthly: 6,
};

const backupPattern = /^taskdesk-backup-(\d{8})-(\d{6})\.sqlite$/;

function getBackupDir(targetDir?: string) {
  const userData = app.getPath('userData');
  return targetDir ?? path.join(userData, 'backups');
}

function getDbPath() {
  return path.join(app.getPath('userData'), 'taskdesk.sqlite');
}

function copySidecars(sourceDb: string, targetBase: string) {
  const wal = `${sourceDb}-wal`;
  const shm = `${sourceDb}-shm`;
  if (fs.existsSync(wal)) fs.copyFileSync(wal, `${targetBase}-wal`);
  if (fs.existsSync(shm)) fs.copyFileSync(shm, `${targetBase}-shm`);
}

export function listBackups(targetDir?: string) {
  const destDir = getBackupDir(targetDir);
  if (!fs.existsSync(destDir)) return [];
  const entries = fs.readdirSync(destDir);
  return entries
    .filter((name) => name.startsWith('taskdesk-backup-') && name.endsWith('.sqlite'))
    .map((name) => {
      const fullPath = path.join(destDir, name);
      const stats = fs.statSync(fullPath);
      return {
        path: fullPath,
        name,
        createdAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function parseBackupDate(name: string) {
  const match = name.match(backupPattern);
  if (!match) return null;
  const datePart = match[1];
  const timePart = match[2];
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  const hour = Number(timePart.slice(0, 2));
  const minute = Number(timePart.slice(2, 4));
  const second = Number(timePart.slice(4, 6));
  return new Date(year, month, day, hour, minute, second);
}

function getISOWeekKey(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function rotateBackups(targetDir?: string) {
  const backups = listBackups(targetDir);
  const dailyKeep = new Set<string>();
  const weeklyKeep = new Set<string>();
  const monthlyKeep = new Set<string>();
  const keepPaths = new Set<string>();

  backups.forEach((backup) => {
    const parsed = parseBackupDate(backup.name) ?? new Date(backup.createdAt);
    const dayKey = parsed.toISOString().slice(0, 10);
    const weekKey = getISOWeekKey(parsed);
    const monthKey = dayKey.slice(0, 7);

    if (dailyKeep.size < defaultRetention.daily && !dailyKeep.has(dayKey)) {
      dailyKeep.add(dayKey);
      keepPaths.add(backup.path);
      return;
    }
    if (weeklyKeep.size < defaultRetention.weekly && !weeklyKeep.has(weekKey)) {
      weeklyKeep.add(weekKey);
      keepPaths.add(backup.path);
      return;
    }
    if (monthlyKeep.size < defaultRetention.monthly && !monthlyKeep.has(monthKey)) {
      monthlyKeep.add(monthKey);
      keepPaths.add(backup.path);
    }
  });

  backups.filter((backup) => !keepPaths.has(backup.path)).forEach((backup) => {
    try {
      fs.unlinkSync(backup.path);
      const wal = `${backup.path}-wal`;
      const shm = `${backup.path}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch (error) {
      console.warn('[taskdesk:backup] cleanup failed', backup.path, error);
    }
  });
}

export function createBackup(targetDir?: string) {
  const sourceDb = getDbPath();
  const destDir = getBackupDir(targetDir);
  fs.mkdirSync(destDir, { recursive: true });
  const backupPath = path.join(destDir, `taskdesk-backup-${timestamp()}.sqlite`);

  if (!fs.existsSync(sourceDb)) {
    throw new Error('Database file not found.');
  }

  fs.copyFileSync(sourceDb, backupPath);
  copySidecars(sourceDb, backupPath);
  rotateBackups(destDir);

  return backupPath;
}

export function restoreBackup(backupPath: string) {
  const sourceDb = backupPath;
  const targetDb = getDbPath();
  if (!fs.existsSync(sourceDb)) {
    throw new Error('Backup file not found.');
  }
  if (fs.existsSync(targetDb)) {
    const backupDir = getBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });
    const safetyPath = path.join(backupDir, `taskdesk-pre-restore-${timestamp()}.sqlite`);
    fs.copyFileSync(targetDb, safetyPath);
    copySidecars(targetDb, safetyPath);
  }
  fs.copyFileSync(sourceDb, targetDb);
  copySidecars(sourceDb, targetDb);
  return targetDb;
}
