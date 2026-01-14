import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const defaultRetention = 10;

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

function rotateBackups(targetDir?: string, keep = defaultRetention) {
  const backups = listBackups(targetDir);
  const overflow = backups.slice(keep);
  overflow.forEach((backup) => {
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
  fs.copyFileSync(sourceDb, targetDb);
  copySidecars(sourceDb, targetDb);
  return targetDb;
}
