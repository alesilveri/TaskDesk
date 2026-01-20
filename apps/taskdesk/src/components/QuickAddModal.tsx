import type { Dispatch, SetStateAction } from 'react';
import type { ActivityHistory, ActivityInput, ActivityStatus, Client } from '../types';
import { MAX_ACTIVITY_MINUTES, MIN_ACTIVITY_MINUTES, MINUTE_SUGGESTIONS } from '../utils/time';

type QuickAddModalProps = {
  open: boolean;
  title: string;
  form: ActivityInput;
  setForm: Dispatch<SetStateAction<ActivityInput>>;
  clients: Client[];
  history: ActivityHistory[];
  formError: string | null;
  warnings: string[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onSaveTemplate: () => void;
};

export default function QuickAddModal({
  open,
  title,
  form,
  setForm,
  clients,
  history,
  formError,
  warnings,
  onClose,
  onSubmit,
  onSaveTemplate,
}: QuickAddModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="heading text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-ink/50">
            Chiudi
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          {formError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Data
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-lg border border-ink/10 px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Cliente
              <input
                type="text"
                value={form.clientName ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
                list="clienti"
                className="rounded-lg border border-ink/10 px-3 py-2"
              />
              <datalist id="clienti">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            Titolo
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Descrizione
            <textarea
              value={form.description ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[90px] rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              Minuti
              <input
                type="number"
                value={form.minutes}
                onChange={(event) => setForm((prev) => ({ ...prev, minutes: Number(event.target.value) }))}
                className="rounded-lg border border-ink/10 px-3 py-2"
                min={MIN_ACTIVITY_MINUTES}
                max={MAX_ACTIVITY_MINUTES}
                step={5}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {MINUTE_SUGGESTIONS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setForm((prev) => ({ ...prev, minutes: value }))}
                    className="rounded-full bg-ink/5 px-3 py-1 text-xs"
                  >
                    {value}m
                  </button>
                ))}
              </div>
            </label>
            <label className="grid gap-2 text-sm">
              Rif. verbale
              <input
                type="text"
                value={form.referenceVerbale ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, referenceVerbale: event.target.value }))}
                className="rounded-lg border border-ink/10 px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Risorsa/ICON
              <input
                type="text"
                value={form.resourceIcon ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, resourceIcon: event.target.value }))}
                className="rounded-lg border border-ink/10 px-3 py-2"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            Tag (separati da virgola)
            <input
              type="text"
              value={form.tags?.join(', ') ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                }))
              }
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <label className="grid gap-2">
              Stato
              <select
                value={form.status ?? 'bozza'}
                onChange={(event) => {
                  const nextStatus = event.target.value as ActivityStatus;
                  setForm((prev) => ({
                    ...prev,
                    status: nextStatus,
                    inGestore: nextStatus === 'inserita',
                  }));
                }}
                className="rounded-lg border border-ink/10 px-3 py-2"
              >
                <option value="bozza">Bozza</option>
                <option value="inserita">Inserita</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.inGestore ?? false}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    inGestore: checked,
                    status: checked ? 'inserita' : 'bozza',
                  }));
                }}
              />
              Caricata nel Gestore
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.verbaleDone ?? false}
                onChange={(event) => setForm((prev) => ({ ...prev, verbaleDone: event.target.checked }))}
              />
              Verbale fatto
            </label>
          </div>
          {history.length > 0 && (
            <div className="rounded-lg border border-ink/10 bg-sand/40 p-3 text-xs text-ink/70">
              <div className="font-semibold">Cronologia</div>
              <ul className="mt-2 grid gap-1">
                {history.map((item) => (
                  <li key={item.id}>
                    {item.changedAt}: {item.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-ink/10 px-4 py-2 text-sm" onClick={onClose}>
              Annulla
            </button>
            <button type="button" className="rounded-lg border border-ink/10 px-4 py-2 text-sm" onClick={onSaveTemplate}>
              Salva preset
            </button>
            <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
