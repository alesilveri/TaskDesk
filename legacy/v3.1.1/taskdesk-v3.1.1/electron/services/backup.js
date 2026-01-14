const fs = require('node:fs');
const path = require('node:path');

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`;
}

function createBackup(databasePath, targetDirectory) {
  const directory = targetDirectory || path.join(path.dirname(databasePath), 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const fileName = `taskdesk-backup-${timestamp()}.sqlite`;
  const destination = path.join(directory, fileName);
  fs.copyFileSync(databasePath, destination);
  return destination;
}

function restoreBackup(sourcePath, databasePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Il file di backup non esiste');
  }
  const directory = path.dirname(databasePath);
  fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(sourcePath, databasePath);
  return databasePath;
}

module.exports = {
  createBackup,
  restoreBackup,
};

