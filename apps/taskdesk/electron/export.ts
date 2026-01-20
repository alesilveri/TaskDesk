import type Database from 'better-sqlite3';
import ExcelJS from 'exceljs';

type ExportRow = {
  date: string;
  client: string | null;
  title: string;
  description: string | null;
  minutes: number;
  reference: string | null;
  resource: string | null;
  inGestore: number;
  verbale: number;
};

function getMonthlyRows(db: Database.Database, month: string) {
  return db
    .prepare(
      `SELECT a.date as date, c.name as client, a.title as title, a.description as description,
        a.minutes as minutes, a.reference_verbale as reference, a.resource_icon as resource, a.in_gestore as inGestore, a.verbale_done as verbale
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date LIKE ?
      ORDER BY a.date ASC`
    )
    .all(`${month}-%`) as ExportRow[];
}

function getRowsByRange(db: Database.Database, startDate: string, endDate: string) {
  return db
    .prepare(
      `SELECT a.date as date, c.name as client, a.title as title, a.description as description,
        a.minutes as minutes, a.reference_verbale as reference, a.resource_icon as resource, a.in_gestore as inGestore, a.verbale_done as verbale
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date BETWEEN ? AND ?
      ORDER BY a.date ASC`
    )
    .all(startDate, endDate) as ExportRow[];
}

function groupRowsForGestore(rows: ExportRow[]) {
  const grouped = new Map<string, ExportRow & { minutes: number }>();
  rows.forEach((row) => {
    const label = row.reference && row.reference.trim().length > 0 ? row.reference : row.title;
    const key = [row.date, row.client ?? 'Nessun cliente', label].join('|');
    const existing = grouped.get(key);
    if (existing) {
      existing.minutes += row.minutes;
      return;
    }
    grouped.set(key, {
      ...row,
      title: label,
      minutes: row.minutes,
    });
  });
  return Array.from(grouped.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function buildGestoreCopy(rows: ExportRow[]) {
  const header = ['Data', 'Cliente', 'Titolo', 'Minuti', 'Rif Verbale', 'ICON'];
  const groupedRows = groupRowsForGestore(rows);
  const lines = groupedRows.map((row) =>
    [
      row.date,
      row.client ?? 'Nessun cliente',
      row.title,
      row.minutes,
      row.reference ?? '',
      row.resource ?? '',
    ].join('\t')
  );
  return [header.join('\t'), ...lines].join('\n');
}

export async function exportMonthlyXlsx(db: Database.Database, month: string, targetPath: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TaskDesk';
  workbook.created = new Date();

  const activitySheet = workbook.addWorksheet('Attivita');
  activitySheet.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Titolo', key: 'title', width: 30 },
    { header: 'Descrizione', key: 'description', width: 40 },
    { header: 'Minuti', key: 'minutes', width: 10 },
    { header: 'Rif Verbale', key: 'reference', width: 18 },
    { header: 'Risorsa/ICON', key: 'resource', width: 18 },
    { header: 'Caricata nel Gestore', key: 'inGestore', width: 18 },
    { header: 'Verbale fatto', key: 'verbale', width: 12 },
  ];

  const rows = getMonthlyRows(db, month);

  rows.forEach((row) => {
    activitySheet.addRow({
      date: row.date,
      client: row.client ?? 'Nessun cliente',
      title: row.title,
      description: row.description ?? '',
      minutes: row.minutes,
      reference: row.reference ?? '',
      resource: row.resource ?? '',
      inGestore: row.inGestore ? 'SI' : 'NO',
      verbale: row.verbale ? 'SI' : 'NO',
    });
  });

  const dailyTaskSheet = workbook.addWorksheet('Daily Task ICON');
  dailyTaskSheet.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Titolo', key: 'title', width: 30 },
    { header: 'Rif Verbale', key: 'reference', width: 18 },
    { header: 'ICON', key: 'icon', width: 16 },
    { header: 'Minuti', key: 'minutes', width: 10 },
  ];

  rows.forEach((row) => {
    dailyTaskSheet.addRow({
      date: row.date,
      client: row.client ?? 'Nessun cliente',
      title: row.title,
      reference: row.reference ?? '',
      icon: row.resource ?? '',
      minutes: row.minutes,
    });
  });

  const copySheet = workbook.addWorksheet('CopiaIncolla');
  copySheet.columns = [{ header: 'Riga', key: 'line', width: 100 }];
  const copyLines = buildGestoreCopy(rows).split('\n');
  copyLines.forEach((line) => copySheet.addRow({ line }));

  const summarySheet = workbook.addWorksheet('Report mese');
  summarySheet.columns = [
    { header: 'Cliente', key: 'client', width: 32 },
    { header: 'Minuti', key: 'minutes', width: 12 },
    { header: 'Ore', key: 'hours', width: 10 },
  ];

  const summaryRows = db
    .prepare(
      `SELECT c.name as client, SUM(a.minutes) as minutes
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.date LIKE ?
      GROUP BY c.name
      ORDER BY minutes DESC`
    )
    .all(`${month}-%`) as { client: string | null; minutes: number }[];

  summaryRows.forEach((row) => {
    const minutes = row.minutes ?? 0;
    summarySheet.addRow({
      client: row.client ?? 'Nessun cliente',
      minutes,
      hours: (minutes / 60).toFixed(2),
    });
  });

  const insertSheet = workbook.addWorksheet('Non inserite');
  insertSheet.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Titolo', key: 'title', width: 30 },
    { header: 'Minuti', key: 'minutes', width: 10 },
    { header: 'Rif Verbale', key: 'reference', width: 18 },
  ];

  const insertRows = rows.filter((row) => row.inGestore === 0);
  insertRows.forEach((row) => {
    insertSheet.addRow({
      date: row.date,
      client: row.client ?? 'Nessun cliente',
      title: row.title,
      minutes: row.minutes,
      reference: row.reference ?? '',
    });
  });

  await workbook.xlsx.writeFile(targetPath);
  return targetPath;
}
export function exportMonthlyCopy(db: Database.Database, month: string) {
  const rows = getMonthlyRows(db, month);
  return buildGestoreCopy(rows);
}

export function exportWeeklyCopy(db: Database.Database, startDate: string, endDate: string) {
  const rows = getRowsByRange(db, startDate, endDate);
  return buildGestoreCopy(rows);
}
