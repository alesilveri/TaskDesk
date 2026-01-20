const fs = require('node:fs');
const { parse } = require('csv-parse/sync');

function normaliseRecord(record) {
  if (typeof record === 'string') {
    return { name: record.trim() };
  }
  const keys = Object.keys(record);
  const pick = (variants) => variants.map((variant) => record[variant]).find((value) => !!value);
  const name =
    pick(['name', 'Name', 'cliente', 'Cliente', 'CLIENTE', 'ragione_sociale']) ||
    record[keys[0]] ||
    '';
  return {
    name: (name || '').trim(),
    category: pick(['category', 'Categoria', 'categoria'])?.trim() || null,
    contactName: pick(['contactName', 'Referente', 'referente'])?.trim() || null,
    contactEmail: pick(['email', 'Email', 'MAIL'])?.trim() || null,
    contactPhone: pick(['phone', 'Telefono', 'telefono'])?.trim() || null,
    notes: pick(['note', 'Notes', 'Note'])?.trim() || null,
  };
}

function importClientsFromCSV(filePath, { findByName, createClient }) {
  const content = fs.readFileSync(filePath, 'utf8');
  let records = [];
  try {
    const parsed = parse(content, { columns: true, skip_empty_lines: true, bom: true, trim: true });
    if (parsed.length) {
      records = parsed.map(normaliseRecord);
    }
  } catch (err) {
    // fallback to line-by-line
  }
  if (!records.length) {
    records = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normaliseRecord(line));
  }

  let imported = 0;
  let skipped = 0;

  records.forEach((record) => {
    if (!record.name) {
      skipped += 1;
      return;
    }
    const exists = findByName(record.name);
    if (exists) {
      skipped += 1;
      return;
    }
    createClient({
      name: record.name,
      category: record.category,
      contactName: record.contactName,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
      notes: record.notes,
    });
    imported += 1;
  });

  return { imported, skipped, total: records.length };
}

function exportClientsToCSV(filePath, clients) {
  const headers = [
    'Nome',
    'Categoria',
    'Referente',
    'Email',
    'Telefono',
    'Note',
    'Attivo',
    'Creato il',
    'Aggiornato il',
  ];
  const lines = [headers.join(';')];
  clients.forEach((client) => {
    const row = [
      client.name,
      client.category || '',
      client.contactName || '',
      client.contactEmail || '',
      client.contactPhone || '',
      client.notes || '',
      client.active ? 'Sì' : 'No',
      client.createdAt,
      client.updatedAt,
    ];
    lines.push(row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'));
  });
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return filePath;
}

module.exports = {
  importClientsFromCSV,
  exportClientsToCSV,
};

