import { useEffect, useMemo, useState } from 'react';
import type { Activity, ActivityStatus } from '../types';

type SearchFilters = {
  text: string;
  client: string;
  status: ActivityStatus | 'all';
  startDate: string;
  endDate: string;
  onlyNotInserted: boolean;
};

const defaultSearchFilters: SearchFilters = {
  text: '',
  client: '',
  status: 'all',
  startDate: '',
  endDate: '',
  onlyNotInserted: false,
};

type SearchViewProps = {
  onOpenEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
};

type SavedFilter = {
  id: string;
  name: string;
  filters: SearchFilters;
};

const storageKey = 'taskdesk.search.presets';

export default function SearchView({ onOpenEdit, onDelete }: SearchViewProps) {
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultSearchFilters });
  const [results, setResults] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SavedFilter[]>([]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.text ||
      filters.client ||
      filters.status !== 'all' ||
      filters.startDate ||
      filters.endDate ||
      filters.onlyNotInserted
    );
  }, [filters]);

  useEffect(() => {
    window.api.ui.onResetFilters(() => {
      setFilters({ ...defaultSearchFilters });
      setResults([]);
    });
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedFilter[];
      setPresets(parsed);
    } catch {
      setPresets([]);
    }
  }, []);

  function savePresets(next: SavedFilter[]) {
    setPresets(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function handleSavePreset() {
    if (!presetName.trim()) return;
    const next: SavedFilter[] = [
      ...presets,
      {
        id: `${Date.now()}`,
        name: presetName.trim(),
        filters,
      },
    ];
    savePresets(next);
    setPresetName('');
  }

  function handleApplyPreset(preset: SavedFilter) {
    setFilters(preset.filters);
    setResults([]);
  }

  function handleDeletePreset(id: string) {
    savePresets(presets.filter((preset) => preset.id !== id));
  }

  async function handleSearch() {
    setLoading(true);
    try {
      const list = await window.api.activities.search(filters);
      setResults(list);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await window.api.activities.remove(id);
    setResults((prev) => prev.filter((item) => item.id !== id));
    onDelete(id);
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="rounded-xl border border-ink/10 bg-surface p-4">
        <div className="grid gap-4 md:grid-cols-6">
          <label className="grid gap-2 text-sm md:col-span-2">
            Testo
            <input
              type="text"
              value={filters.text}
              onChange={(event) => setFilters((prev) => ({ ...prev, text: event.target.value }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            Cliente
            <input
              type="text"
              value={filters.client}
              onChange={(event) => setFilters((prev) => ({ ...prev, client: event.target.value }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Da
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            A
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Stato
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as ActivityStatus | 'all' }))}
              className="rounded-lg border border-ink/10 px-3 py-2"
            >
              <option value="all">Tutti</option>
              <option value="bozza">Bozza</option>
              <option value="inserita">Inserita</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.onlyNotInserted}
              onChange={(event) => setFilters((prev) => ({ ...prev, onlyNotInserted: event.target.checked }))}
            />
            Non ancora inserite
          </label>
          <button className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white" onClick={handleSearch}>
            Cerca
          </button>
          <button
            className="rounded-lg border border-ink/10 px-4 py-2 text-xs"
            onClick={() => {
              setFilters({ ...defaultSearchFilters });
              setResults([]);
            }}
          >
            Reset
          </button>
          <button
            className="rounded-lg border border-ink/10 px-4 py-2 text-xs"
            disabled={!hasActiveFilters}
            onClick={() => setPresetName('Filtro salvato')}
          >
            Salva filtro
          </button>
          {loading && <span className="text-xs text-ink/50">Ricerca in corso...</span>}
        </div>
        {presetName && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              className="rounded-lg border border-ink/10 px-3 py-2"
              placeholder="Nome filtro"
            />
            <button className="rounded-lg bg-ink px-3 py-2 text-white" onClick={handleSavePreset}>
              Salva
            </button>
            <button className="rounded-lg border border-ink/10 px-3 py-2" onClick={() => setPresetName('')}>
              Annulla
            </button>
          </div>
        )}
      </div>

      {presets.length > 0 && (
        <div className="rounded-xl border border-ink/10 bg-surface p-4">
          <div className="text-sm font-semibold">Filtri salvati</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1">
                <button onClick={() => handleApplyPreset(preset)}>{preset.name}</button>
                <button className="text-ink/40" onClick={() => handleDeletePreset(preset.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-ink/10 bg-surface">
        <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Risultati ({results.length})</div>
        <div className="divide-y divide-black/10">
          {results.map((activity) => (
            <div key={activity.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
              <div>
                <div className="text-sm font-semibold">
                  {activity.title} <span className="text-xs text-ink/50">({activity.date})</span>
                </div>
                <div className="text-xs text-ink/50">
                  {activity.clientName ?? 'Nessun cliente'} - {activity.minutes} min
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/50">
                  <span className="rounded-full bg-ink/5 px-2 py-1">Stato: {activity.status}</span>
                  {activity.inGestore && <span className="rounded-full bg-teal/15 px-2 py-1">Gestore OK</span>}
                  {activity.verbaleDone && <span className="rounded-full bg-amber/20 px-2 py-1">Verbale OK</span>}
                  {activity.tags.map((tag) => (
                    <span key={`${activity.id}-${tag}`} className="rounded-full bg-ink/5 px-2 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button className="text-ink/70" onClick={() => onOpenEdit(activity)}>
                  Modifica
                </button>
                <button className="text-danger" onClick={() => handleDelete(activity.id)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
          {results.length === 0 && <div className="px-4 py-10 text-center text-sm text-ink/50">Nessun risultato.</div>}
        </div>
      </div>
    </section>
  );
}
