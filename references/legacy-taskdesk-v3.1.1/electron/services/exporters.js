const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

async function exportMonthToExcel({ month, summary, activities, filePath }) {
  ensureDirectory(filePath);
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const summarySheet = workbook.addWorksheet('Riepilogo');
  summarySheet.columns = [
    { header: 'Metrica', key: 'metric', width: 28 },
    { header: 'Valore', key: 'value', width: 18 },
  ];

  const metrics = [
    ['Mese', month],
    ['Ore totali', minutesToHours(summary.totals.totalMinutes)],
    ['Ore fatturabili', minutesToHours(summary.totals.billableMinutes)],
    ['Ore non fatturabili', minutesToHours(summary.totals.nonBillableMinutes)],
    ['Attività', summary.totals.totalActivities],
    ['Clienti unici', summary.totals.uniqueClients],
    ['Giorni attivi', summary.totals.activeDays],
    ['Media ore/giorno attivo', minutesToHours(summary.totals.averageDailyMinutes)],
  ];

  metrics.forEach(([metric, value]) => {
    summarySheet.addRow({ metric, value });
  });

  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn(1).font = { bold: true };

  const clientsSheet = workbook.addWorksheet('Clienti');
  clientsSheet.columns = [
    { header: 'Cliente', key: 'client', width: 45 },
    { header: 'Ore', key: 'hours', width: 12 },
    { header: 'Attività', key: 'count', width: 12 },
  ];
  clientsSheet.getRow(1).font = { bold: true };
  summary.topClients.forEach((client) => {
    clientsSheet.addRow({
      client: client.clientName || 'Senza cliente',
      hours: minutesToHours(client.totalMinutes),
      count: client.count,
    });
  });

  const detailSheet = workbook.addWorksheet('Attività');
  detailSheet.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Inizio', key: 'startTime', width: 10 },
    { header: 'Fine', key: 'endTime', width: 10 },
    { header: 'Durata (h)', key: 'duration', width: 12 },
    { header: 'Cliente', key: 'client', width: 45 },
    { header: 'Titolo', key: 'title', width: 45 },
    { header: 'Tipo', key: 'type', width: 16 },
    { header: 'Stato', key: 'status', width: 16 },
    { header: 'Fatturabile', key: 'billable', width: 14 },
    { header: 'Tag', key: 'tags', width: 28 },
    { header: 'Note', key: 'notes', width: 48 },
  ];
  detailSheet.getRow(1).font = { bold: true };

  activities.forEach((activity) => {
    detailSheet.addRow({
      date: activity.date,
      startTime: activity.startTime || '',
      endTime: activity.endTime || '',
      duration: minutesToHours(activity.durationMinutes || 0),
      client: activity.clientName || '',
      title: activity.title,
      type: activity.type,
      status: activity.status,
      billable: activity.billable ? 'Sì' : 'No',
      tags: (activity.tags || []).join(', '),
      notes: activity.notes || '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function exportMonthToPdf({ month, summary, activities, filePath }) {
  ensureDirectory(filePath);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(20).text(`TaskDesk – Riepilogo ${month}`, { align: 'left' });
  doc.moveDown(1);
  doc.fontSize(12).text(`Ore totali: ${minutesToHours(summary.totals.totalMinutes)}`);
  doc.text(`Ore fatturabili: ${minutesToHours(summary.totals.billableMinutes)}`);
  doc.text(`Clienti unici: ${summary.totals.uniqueClients}`);
  doc.text(`Giorni attivi: ${summary.totals.activeDays}`);
  doc.text(`Attività: ${summary.totals.totalActivities}`);
  doc.moveDown(1);

  doc.fontSize(14).text('Top clienti', { underline: true });
  doc.moveDown(0.5);
  summary.topClients.slice(0, 10).forEach((client) => {
    doc.fontSize(11).text(
      `${client.clientName || 'Senza cliente'} – ${minutesToHours(client.totalMinutes)} h (${client.count} attività)`,
    );
  });

  doc.addPage();
  doc.fontSize(14).text('Attività principali', { underline: true });
  doc.moveDown(0.5);

  const tableHeader = ['Data', 'Cliente', 'Titolo', 'Durata (h)', 'Fatt.'];
  doc.fontSize(10).text(tableHeader.join(' | '));
  doc.moveDown(0.25);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.25);

  activities.slice(0, 40).forEach((activity) => {
    const line = [
      activity.date,
      (activity.clientName || '').slice(0, 28),
      activity.title.slice(0, 32),
      minutesToHours(activity.durationMinutes || 0).toString(),
      activity.billable ? 'Sì' : 'No',
    ].join(' | ');
    doc.text(line);
  });

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

module.exports = {
  exportMonthToExcel,
  exportMonthToPdf,
};

