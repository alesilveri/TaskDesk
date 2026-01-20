import { useState } from 'react';
import type { Client } from '../types';

type ClientsViewProps = {
  clients: Client[];
  recentClients: Client[];
  onRefreshClients: () => void;
};

export default function ClientsView({ clients, recentClients, onRefreshClients }: ClientsViewProps) {
  const [csvPath, setCsvPath] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSample, setCsvSample] = useState<Record<string, string>[]>([]);
  const [csvColumn, setCsvColumn] = useState<string>('');
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);

  async function handleCsvInspect(file: File | null) {
    if (!file) return;
    const filePath = (file as File & { path?: string }).path ?? '';
    if (!filePath) return;
    const inspection = await window.api.clients.inspectCsv(filePath);
    setCsvPath(filePath);
    setCsvHeaders(inspection.headers);
    setCsvSample(inspection.sample);
    setCsvColumn(inspection.headers[0] ?? '');
    setCsvImportMessage(null);
  }

  async function handleCsvImport() {
    if (!csvPath || !csvColumn) return;
    const result = await window.api.clients.importCsv(csvPath, csvColumn);
    setCsvImportMessage(`Importati ${result.inserted} clienti, saltati ${result.skipped}.`);
    onRefreshClients();
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-ink/10 bg-surface p-4">
        <div className="text-sm font-semibold">Recenti</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {recentClients.map((client) => (
            <span key={client.id} className="rounded-full bg-ink/5 px-3 py-1 text-xs">
              {client.name}
            </span>
          ))}
          {recentClients.length === 0 && <span className="text-xs text-ink/50">Nessun cliente recente.</span>}
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-surface">
        <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Clienti</div>
        <div className="divide-y divide-black/10">
          {clients.map((client) => (
            <div key={client.id} className="px-4 py-3 text-sm">
              {client.name}
            </div>
          ))}
          {clients.length === 0 && <div className="px-4 py-10 text-center text-sm text-ink/50">Nessun cliente.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-surface p-4">
        <div className="text-sm font-semibold">Importa CSV</div>
        <div className="mt-3 grid gap-3 text-sm text-ink/70">
          <input type="file" accept=".csv" onChange={(event) => handleCsvInspect(event.target.files?.[0] ?? null)} />
          {csvHeaders.length > 0 && (
            <label className="grid gap-2 text-sm">
              Colonna cliente
              <select
                value={csvColumn}
                onChange={(event) => setCsvColumn(event.target.value)}
                className="rounded-lg border border-ink/10 px-3 py-2"
              >
                {csvHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          )}
          {csvSample.length > 0 && (
            <div className="rounded-lg border border-ink/10 bg-sand/30 p-3 text-xs">
              <div className="font-semibold">Anteprima</div>
              {csvSample.map((row, index) => (
                <div key={`sample-${index}`} className="mt-2">
                  {csvHeaders.map((header) => (
                    <span key={header} className="mr-3">
                      {header}: {row[header]}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white"
              onClick={handleCsvImport}
              disabled={!csvPath || !csvColumn}
            >
              Importa clienti
            </button>
            {csvImportMessage && <span className="text-xs text-ink/50">{csvImportMessage}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
