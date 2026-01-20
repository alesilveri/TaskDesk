import { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Activity, ActivityStatus, ActivityTemplate, DailySummary } from '../types';
import { buildSmartSuggestions, formatMinutes, MAX_ACTIVITY_MINUTES, MIN_ACTIVITY_MINUTES } from '../utils/time';

type DayFilters = {
  status: ActivityStatus | 'all';
  inGestoreOnly: boolean;
  verbaleOnly: boolean;
  tag: string | null;
  resource: string | null;
};

type InlineEditState = {
  title: string;
  clientName: string;
  minutes: number;
  status: ActivityStatus;
};

type DayViewProps = {
  activities: Activity[];
  dailySummary: DailySummary | null;
  targetMinutes: number;
  patternMinutes: number[];
  templates: ActivityTemplate[];
  onOpenEdit: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onTemplateApply: (template: ActivityTemplate) => void;
  onRefreshDay: () => void;
  onRefreshClients: () => void;
  onOpenSettings: () => void;
};

export default function DayView({
  activities,
  dailySummary,
  targetMinutes,
  patternMinutes,
  templates,
  onOpenEdit,
  onDuplicate,
  onDelete,
  onTemplateApply,
  onRefreshDay,
  onRefreshClients,
  onOpenSettings,
}: DayViewProps) {
  const [quickFilter, setQuickFilter] = useState('');
  const [filters, setFilters] = useState<DayFilters>({
    status: 'all',
    inGestoreOnly: false,
    verbaleOnly: false,
    tag: null,
    resource: null,
  });
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [compact, setCompact] = useState(true);

  const totalMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const gapMinutes = Math.max(targetMinutes - totalMinutes, 0);
  const smartSuggestions = useMemo(() => buildSmartSuggestions(gapMinutes, patternMinutes), [gapMinutes, patternMinutes]);

  const dayAnomalies = useMemo(() => {
    const counts = new Map<number, number>();
    activities.forEach((activity) => {
      counts.set(activity.minutes, (counts.get(activity.minutes) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([minutes, count]) => minutes >= 60 && count >= 3)
      .map(([minutes, count]) => ({ minutes, count }));
  }, [activities]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((activity) => activity.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  const availableResources = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((activity) => {
      if (activity.resourceIcon) set.add(activity.resourceIcon);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const term = quickFilter.trim().toLowerCase();
    return activities.filter((activity) => {
      if (filters.status !== 'all' && activity.status !== filters.status) return false;
      if (filters.inGestoreOnly && !activity.inGestore) return false;
      if (filters.verbaleOnly && !activity.verbaleDone) return false;
      if (filters.tag && !activity.tags.includes(filters.tag)) return false;
      if (filters.resource && activity.resourceIcon !== filters.resource) return false;
      if (!term) return true;
      const haystack = [
        activity.title,
        activity.clientName ?? '',
        activity.description ?? '',
        activity.referenceVerbale ?? '',
        activity.resourceIcon ?? '',
        activity.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [activities, filters, quickFilter]);

  function startInlineEdit(activity: Activity) {
    setInlineError(null);
    setInlineEditId(activity.id);
    setInlineEdit({
      title: activity.title,
      clientName: activity.clientName ?? '',
      minutes: activity.minutes,
      status: activity.status,
    });
  }

  function cancelInlineEdit() {
    setInlineEditId(null);
    setInlineEdit(null);
    setInlineError(null);
  }

  async function saveInlineEdit() {
    if (!inlineEditId || !inlineEdit) return;
    if (!inlineEdit.title.trim()) {
      setInlineError('Titolo obbligatorio.');
      return;
    }
    if (!Number.isInteger(inlineEdit.minutes)) {
      setInlineError('Minuti devono essere un numero intero.');
      return;
    }
    if (inlineEdit.minutes < MIN_ACTIVITY_MINUTES || inlineEdit.minutes > MAX_ACTIVITY_MINUTES) {
      setInlineError(`Minuti devono essere tra ${MIN_ACTIVITY_MINUTES} e ${MAX_ACTIVITY_MINUTES}.`);
      return;
    }
    try {
      await window.api.activities.update(inlineEditId, {
        title: inlineEdit.title,
        clientName: inlineEdit.clientName,
        minutes: inlineEdit.minutes,
        status: inlineEdit.status,
      });
      cancelInlineEdit();
      onRefreshDay();
      onRefreshClients();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Errore durante il salvataggio.');
    }
  }

  const dayRowSize = compact ? 150 : 190;
  const dayListHeight = Math.min(520, Math.max(240, filteredActivities.length * dayRowSize));

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-ink/10 bg-surface p-4">
          <div className="text-xs uppercase text-ink/50">Totale giorno</div>
          <div className="mt-2 text-2xl font-semibold">{formatMinutes(totalMinutes)}</div>
          <div className="mt-2 text-xs text-ink/50">{dailySummary?.totalEntries ?? 0} attivita</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-surface p-4">
          <div className="text-xs uppercase text-ink/50">Gap</div>
          <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(gapMinutes)}</div>
          <div className="mt-2 text-xs text-ink/50">Target: {formatMinutes(targetMinutes)}</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-surface p-4">
          <div className="text-xs uppercase text-ink/50">Suggerimenti smart</div>
          <div className="mt-2 grid gap-2 text-xs text-ink/70">
            {smartSuggestions.length === 0 && <span className="text-xs text-ink/50">Gap chiuso</span>}
            {smartSuggestions.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-2">
                <span>{item.label}</span>
                <span className="text-ink/60">{item.minutes}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <input
            type="text"
            value={quickFilter}
            onChange={(event) => setQuickFilter(event.target.value)}
            placeholder="Cerca titolo, cliente, tag, rif, risorsa"
            className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm md:flex-1"
          />
          <button className="rounded-lg border border-ink/10 px-3 py-2 text-xs" onClick={() => setQuickFilter('')}>
            Reset
          </button>
          <div className="text-ink/50">
            {filteredActivities.length}/{activities.length} attivita
          </div>
        </div>
      </div>

      <details className="rounded-xl border border-ink/10 bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink/70">Strumenti avanzati</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-ink/50">Filtri</div>
            <div className="mt-3 grid gap-3 text-xs text-ink/70">
              <label className="flex items-center gap-2">
                Stato
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as ActivityStatus | 'all' }))}
                  className="rounded-lg border border-ink/10 px-2 py-1"
                >
                  <option value="all">Tutti</option>
                  <option value="bozza">Bozza</option>
                  <option value="inserita">Inserita</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.inGestoreOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, inGestoreOnly: event.target.checked }))}
                />
                Solo inserite
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.verbaleOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, verbaleOnly: event.target.checked }))}
                />
                Verbale OK
              </label>
              <button
                className="rounded-lg border border-ink/10 px-2 py-1 text-xs"
                onClick={() => setFilters({ status: 'all', inGestoreOnly: false, verbaleOnly: false, tag: null, resource: null })}
              >
                Pulisci filtri
              </button>
            </div>
            {(availableTags.length > 0 || availableResources.length > 0) && (
              <div className="mt-4">
                <div className="text-xs uppercase text-ink/50">Tag / Risorse</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      className={`rounded-full px-3 py-1 ${filters.tag === tag ? 'bg-ink text-white' : 'bg-ink/5'}`}
                      onClick={() => setFilters((prev) => ({ ...prev, tag: prev.tag === tag ? null : tag }))}
                    >
                      #{tag}
                    </button>
                  ))}
                  {availableResources.map((resource) => (
                    <button
                      key={resource}
                      className={`rounded-full px-3 py-1 ${filters.resource === resource ? 'bg-ink text-white' : 'bg-ink/5'}`}
                      onClick={() => setFilters((prev) => ({ ...prev, resource: prev.resource === resource ? null : resource }))}
                    >
                      ICON: {resource}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase text-ink/50">Preset rapidi</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  className="rounded-full bg-ink/5 px-3 py-1 text-xs"
                  onClick={() => onTemplateApply(template)}
                >
                  {template.title}
                </button>
              ))}
              {templates.length === 0 && <span className="text-xs text-ink/50">Nessun preset salvato.</span>}
            </div>
            <button className="mt-3 text-xs text-ink/60" onClick={onOpenSettings}>
              Gestisci preset
            </button>
          </div>

          <div>
            <div className="text-xs uppercase text-ink/50">Anomalie</div>
            <div className="mt-3 grid gap-2 text-xs text-ink/70">
              {dayAnomalies.length === 0 && <span className="text-ink/50">Nessuna anomalia rilevata.</span>}
              {dayAnomalies.map((item) => (
                <div key={`anomaly-${item.minutes}`}>
                  {item.count} voci da {item.minutes}m
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="rounded-xl border border-ink/10 bg-surface">
        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 text-sm font-semibold">
          <span>Attivita del giorno</span>
          <div className="flex items-center gap-2 text-xs">
            <button
              className={`rounded-full px-3 py-1 ${compact ? 'bg-ink text-white' : 'bg-ink/5'}`}
              onClick={() => setCompact(true)}
            >
              Compact
            </button>
            <button
              className={`rounded-full px-3 py-1 ${!compact ? 'bg-ink text-white' : 'bg-ink/5'}`}
              onClick={() => setCompact(false)}
            >
              Comfort
            </button>
          </div>
        </div>
        {filteredActivities.length > 0 ? (
          <List height={dayListHeight} itemCount={filteredActivities.length} itemSize={dayRowSize} width="100%">
            {({ index, style }) => {
              const activity = filteredActivities[index];
              return (
                <div
                  key={activity.id}
                  style={style}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 px-4 py-4"
                  onDoubleClick={() => onOpenEdit(activity)}
                >
                  {inlineEditId === activity.id && inlineEdit ? (
                    <div className="w-full">
                      <div className="grid gap-3 md:grid-cols-4">
                        <label className="grid gap-2 text-xs">
                          Titolo
                          <input
                            type="text"
                            value={inlineEdit.title}
                            onChange={(event) =>
                              setInlineEdit((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                            }
                            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="grid gap-2 text-xs">
                          Cliente
                          <input
                            type="text"
                            value={inlineEdit.clientName}
                            onChange={(event) =>
                              setInlineEdit((prev) => (prev ? { ...prev, clientName: event.target.value } : prev))
                            }
                            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="grid gap-2 text-xs">
                          Minuti
                          <input
                            type="number"
                            min={MIN_ACTIVITY_MINUTES}
                            max={MAX_ACTIVITY_MINUTES}
                            step={5}
                            value={inlineEdit.minutes}
                            onChange={(event) =>
                              setInlineEdit((prev) => (prev ? { ...prev, minutes: Number(event.target.value) } : prev))
                            }
                            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="grid gap-2 text-xs">
                          Stato
                          <select
                            value={inlineEdit.status}
                            onChange={(event) =>
                              setInlineEdit((prev) =>
                                prev ? { ...prev, status: event.target.value as ActivityStatus } : prev
                              )
                            }
                            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                          >
                            <option value="bozza">Bozza</option>
                            <option value="inserita">Inserita</option>
                          </select>
                        </label>
                      </div>
                      {inlineError && <div className="mt-2 text-xs text-danger">{inlineError}</div>}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="text-ink/50">
                          {activity.clientName ?? 'Nessun cliente'} - {activity.minutes} min
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="rounded-lg bg-ink px-3 py-2 text-white" onClick={saveInlineEdit}>
                            Salva
                          </button>
                          <button className="text-ink/70" onClick={cancelInlineEdit}>
                            Annulla
                          </button>
                          <button className="text-ink/70" onClick={() => onOpenEdit(activity)}>
                            Dettagli
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-sm font-semibold">{activity.title}</div>
                        <div className="text-xs text-ink/50">
                          {activity.clientName ?? 'Nessun cliente'} - {activity.minutes} min
                        </div>
                        {activity.description && <p className="mt-2 text-sm text-ink/70">{activity.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/50">
                          <span className="rounded-full bg-ink/5 px-2 py-1">Stato: {activity.status}</span>
                          {activity.inGestore && <span className="rounded-full bg-teal/15 px-2 py-1">Caricata nel Gestore</span>}
                          {activity.verbaleDone && <span className="rounded-full bg-amber/20 px-2 py-1">Verbale OK</span>}
                          {activity.referenceVerbale && (
                            <span className="rounded-full bg-ink/5 px-2 py-1">Rif: {activity.referenceVerbale}</span>
                          )}
                          {activity.resourceIcon && (
                            <button
                              className="rounded-full bg-ink/5 px-2 py-1"
                              onClick={() => setFilters((prev) => ({ ...prev, resource: activity.resourceIcon ?? null }))}
                            >
                              ICON: {activity.resourceIcon}
                            </button>
                          )}
                          {activity.tags.map((tag) => (
                            <button
                              key={`${activity.id}-${tag}`}
                              className="rounded-full bg-ink/5 px-2 py-1"
                              onClick={() => setFilters((prev) => ({ ...prev, tag }))}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button className="text-ink/70" onClick={() => startInlineEdit(activity)}>
                          Modifica inline
                        </button>
                        <button className="text-ink/70" onClick={() => onOpenEdit(activity)}>
                          Modifica
                        </button>
                        <button className="text-ink/70" onClick={() => onDuplicate(activity)}>
                          Duplica
                        </button>
                        <button className="text-danger" onClick={() => onDelete(activity.id)}>
                          Elimina
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            }}
          </List>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-ink/50">
            {quickFilter ? 'Nessuna attivita corrisponde al filtro.' : 'Nessuna attivita per questa data.'}
          </div>
        )}
      </div>
    </section>
  );
}
