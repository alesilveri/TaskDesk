import { useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, endOfISOWeek, endOfMonth, format, isWeekend, parseISO, startOfISOWeek, startOfMonth } from 'date-fns';
import type { Activity, ActivityInput, DailySummary, WeeklySummary, MonthlySummary, Client, BackupInfo } from './types';

const defaultTargetMinutes = 8 * 60;

type View = 'day' | 'week' | 'month' | 'clients' | 'settings';

const emptyInput: ActivityInput = {
  date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  minutes: 30,
};

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes}m`;
}

function countWorkingDays(start: string, end: string) {
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  return days.filter((day) => !isWeekend(day)).length;
}

export default function App() {
  const [view, setView] = useState<View>('day');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [form, setForm] = useState<ActivityInput>({ ...emptyInput });
  const [editingId, setEditingId] = useState<string | null>(null);

  const weekRange = useMemo(() => {
    const date = new Date(selectedDate);
    const start = startOfISOWeek(date);
    const end = endOfISOWeek(date);
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`,
    };
  }, [selectedDate]);

  const monthKey = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);

  const totalMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const gapMinutes = Math.max(defaultTargetMinutes - totalMinutes, 0);

  const monthRange = useMemo(() => {
    const base = new Date(`${monthKey}-01T00:00:00`);
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: format(start, 'MMMM yyyy'),
    };
  }, [monthKey]);

  const weekTargetMinutes = useMemo(
    () => countWorkingDays(weekRange.start, weekRange.end) * defaultTargetMinutes,
    [weekRange.start, weekRange.end]
  );
  const weekGapMinutes = Math.max(weekTargetMinutes - (weeklySummary?.totalMinutes ?? 0), 0);

  const monthTargetMinutes = useMemo(
    () => countWorkingDays(monthRange.start, monthRange.end) * defaultTargetMinutes,
    [monthRange.start, monthRange.end]
  );
  const monthGapMinutes = Math.max(monthTargetMinutes - (monthlySummary?.totalMinutes ?? 0), 0);

  const monthProgress = useMemo(() => {
    if (!monthTargetMinutes) return 0;
    return Math.min(((monthlySummary?.totalMinutes ?? 0) / monthTargetMinutes) * 100, 100);
  }, [monthlySummary?.totalMinutes, monthTargetMinutes]);

  const monthTopClient = useMemo(() => {
    return monthlySummary?.byClient?.[0] ?? null;
  }, [monthlySummary?.byClient]);

  const weekDailyRows = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(weekRange.start), end: parseISO(weekRange.end) });
    const lookup = new Map((weeklySummary?.byDay ?? []).map((item) => [item.date, item]));
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const summary = lookup.get(key);
      return {
        date: key,
        label: format(day, 'EEE dd MMM'),
        totalMinutes: summary?.totalMinutes ?? 0,
        totalEntries: summary?.totalEntries ?? 0,
        gapMinutes: Math.max(defaultTargetMinutes - (summary?.totalMinutes ?? 0), 0),
      };
    });
  }, [weekRange.start, weekRange.end, weeklySummary?.byDay]);

  const monthDailyRows = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(monthRange.start), end: parseISO(monthRange.end) });
    const lookup = new Map((monthlySummary?.byDay ?? []).map((item) => [item.date, item]));
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const summary = lookup.get(key);
      return {
        date: key,
        label: format(day, 'dd MMM'),
        totalMinutes: summary?.totalMinutes ?? 0,
        totalEntries: summary?.totalEntries ?? 0,
        gapMinutes: Math.max(defaultTargetMinutes - (summary?.totalMinutes ?? 0), 0),
      };
    });
  }, [monthRange.start, monthRange.end, monthlySummary?.byDay]);

  const monthTopDay = useMemo(() => {
    return monthDailyRows.reduce(
      (best, item) => (item.totalMinutes > best.totalMinutes ? item : best),
      { date: '', label: '', totalMinutes: 0, totalEntries: 0, gapMinutes: 0 }
    );
  }, [monthDailyRows]);

  const monthHasData = (monthlySummary?.totalEntries ?? 0) > 0;

  useEffect(() => {
    window.api.ui.onNavigate((target) => {
      if (target === 'day' || target === 'week' || target === 'month') {
        setView(target);
      }
    });
    window.api.ui.onQuickAdd(() => {
      setEditingId(null);
      setForm({ ...emptyInput, date: format(new Date(), 'yyyy-MM-dd') });
      setQuickAddOpen(true);
    });
  }, []);

  useEffect(() => {
    loadDay();
  }, [selectedDate]);

  useEffect(() => {
    if (view === 'week') {
      window.api.summaries.weekly(weekRange.start, weekRange.end).then(setWeeklySummary);
    }
  }, [view, weekRange.start, weekRange.end]);

  useEffect(() => {
    if (view === 'month') {
      window.api.summaries.monthly(monthKey).then(setMonthlySummary);
    }
  }, [view, monthKey]);

  useEffect(() => {
    window.api.clients.list().then(setClients);
  }, []);

  useEffect(() => {
    if (view === 'settings') {
      loadBackups();
    }
  }, [view]);

  async function loadDay() {
    const list = await window.api.activities.list(selectedDate);
    setActivities(list);
    const summary = await window.api.summaries.daily(selectedDate);
    setDailySummary(summary);
  }

  async function loadBackups() {
    const list = await window.api.backup.list();
    setBackups(list);
  }

  async function handleCreateActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const payload: ActivityInput = {
      ...form,
      date: form.date || selectedDate,
      minutes: Number(form.minutes),
      tags: form.tags?.length ? form.tags : undefined,
    };
    if (editingId) {
      await window.api.activities.update(editingId, payload);
    } else {
      await window.api.activities.create(payload);
    }
    setForm({ ...emptyInput, date: selectedDate });
    setEditingId(null);
    setQuickAddOpen(false);
    loadDay();
    window.api.clients.list().then(setClients);
  }

  function openEdit(activity: Activity) {
    setEditingId(activity.id);
    setForm({
      date: activity.date,
      clientName: activity.clientName ?? undefined,
      title: activity.title,
      description: activity.description ?? undefined,
      minutes: activity.minutes,
      referenceVerbale: activity.referenceVerbale ?? undefined,
      resourceIcon: activity.resourceIcon ?? undefined,
      tags: activity.tags,
      inGestore: activity.inGestore,
      verbaleDone: activity.verbaleDone,
    });
    setQuickAddOpen(true);
  }

  function openDuplicate(activity: Activity) {
    setEditingId(null);
    setForm({
      date: activity.date,
      clientName: activity.clientName ?? undefined,
      title: activity.title,
      description: activity.description ?? undefined,
      minutes: activity.minutes,
      referenceVerbale: activity.referenceVerbale ?? undefined,
      resourceIcon: activity.resourceIcon ?? undefined,
      tags: activity.tags,
      inGestore: activity.inGestore,
      verbaleDone: activity.verbaleDone,
    });
    setQuickAddOpen(true);
  }

  async function handleDelete(id: string) {
    await window.api.activities.remove(id);
    loadDay();
  }

  async function handleExportMonth() {
    const result = await window.api.exports.monthly(monthKey);
    if (result) {
      window.api.system.notify({ title: 'Export completato', body: `File creato: ${result}` });
    }
  }

  async function handleBackup() {
    const backupPath = await window.api.backup.create();
    loadBackups();
    window.api.system.notify({ title: 'Backup creato', body: `Salvato in: ${backupPath}` });
  }

  async function handleRestoreBackup(backupPath?: string) {
    const selected = backupPath ?? (await window.api.backup.pick());
    if (!selected) return;
    const confirmed = window.confirm('Ripristinare questo backup? I dati correnti verranno sostituiti.');
    if (!confirmed) return;
    await window.api.backup.restore(selected);
    await loadDay();
    window.api.clients.list().then(setClients);
    window.api.summaries.weekly(weekRange.start, weekRange.end).then(setWeeklySummary);
    window.api.summaries.monthly(monthKey).then(setMonthlySummary);
    loadBackups();
    window.api.system.notify({ title: 'Backup ripristinato', body: 'Dati aggiornati con successo.' });
  }

  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-black/10 bg-white px-6 py-6">
          <div className="heading text-2xl font-semibold">TaskDesk</div>
          <p className="mt-1 text-sm text-black/50">Registro attivita smart</p>

          <nav className="mt-8 space-y-2 text-sm">
            {([
              { id: 'day', label: 'Giorno' },
              { id: 'week', label: 'Settimana' },
              { id: 'month', label: 'Mese' },
              { id: 'clients', label: 'Clienti' },
              { id: 'settings', label: 'Impostazioni' },
            ] as { id: View; label: string }[]).map((item) => (
              <button
                key={item.id}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                  view === item.id ? 'bg-ink text-white' : 'hover:bg-black/5'
                }`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-black/10 bg-amber/10 p-4">
            <div className="text-xs uppercase text-black/50">Gap giorno</div>
            <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(gapMinutes)}</div>
            <div className="mt-2 text-xs text-black/50">Target default: 8h</div>
          </div>

          <button
            className="mt-6 w-full rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setEditingId(null);
              setForm({ ...emptyInput, date: selectedDate });
              setQuickAddOpen(true);
            }}
          >
            + Nuova attivita
          </button>
        </aside>

        <main className="px-10 py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="heading text-3xl font-semibold">
                {view === 'day' && 'Giorno'}
                {view === 'week' && 'Settimana'}
                {view === 'month' && 'Mese'}
                {view === 'clients' && 'Clienti'}
                {view === 'settings' && 'Impostazioni'}
              </h1>
              <p className="mt-1 text-sm text-black/50">{selectedDate}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), -1), 'yyyy-MM-dd'))}
              >
                Ieri
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <button
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
              >
                Domani
              </button>
            </div>
          </header>

          {view === 'day' && (
            <section className="mt-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Totale giorno</div>
                  <div className="mt-2 text-2xl font-semibold">{formatMinutes(totalMinutes)}</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Numero attivita</div>
                  <div className="mt-2 text-2xl font-semibold">{dailySummary?.totalEntries ?? 0}</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Gap</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(gapMinutes)}</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-black/10 bg-white">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Attivita del giorno</div>
                <div className="divide-y divide-black/10">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
                      <div>
                        <div className="text-sm font-semibold">{activity.title}</div>
                        <div className="text-xs text-black/50">
                          {activity.clientName ?? 'Nessun cliente'} - {activity.minutes} min
                        </div>
                        {activity.description && <p className="mt-2 text-sm text-black/70">{activity.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-black/50">
                          {activity.inGestore && <span className="rounded-full bg-teal/15 px-2 py-1">Da inserire</span>}
                          {activity.verbaleDone && <span className="rounded-full bg-amber/20 px-2 py-1">Verbale OK</span>}
                          {activity.referenceVerbale && (
                            <span className="rounded-full bg-black/5 px-2 py-1">Rif: {activity.referenceVerbale}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button className="text-ink/70" onClick={() => openEdit(activity)}>
                          Modifica
                        </button>
                        <button className="text-ink/70" onClick={() => openDuplicate(activity)}>
                          Duplica
                        </button>
                        <button className="text-danger" onClick={() => handleDelete(activity.id)}>
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-black/50">Nessuna attivita per questa data.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'week' && (
            <section className="mt-8 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Settimana ISO</div>
                  <div className="mt-2 text-xl font-semibold">{weekRange.label}</div>
                  <div className="mt-3 text-sm text-black/70">
                    Totale: {formatMinutes(weeklySummary?.totalMinutes ?? 0)} · {weeklySummary?.totalEntries ?? 0} voci
                  </div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Target settimana</div>
                  <div className="mt-2 text-2xl font-semibold">{formatMinutes(weekTargetMinutes)}</div>
                  <div className="mt-2 text-xs text-black/50">Giorni lavorativi ISO</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Gap settimana</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(weekGapMinutes)}</div>
                  <div className="mt-2 text-xs text-black/50">Smart gap rispetto target</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-black/10 bg-white lg:col-span-2">
                  <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Per giorno</div>
                  <div className="divide-y divide-black/10">
                    {weekDailyRows.map((row) => (
                      <div key={row.date} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{row.label}</div>
                          <div className="text-xs text-black/50">{row.totalEntries} attivita</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMinutes(row.totalMinutes)}</div>
                          <div className="text-xs text-amber">Gap {formatMinutes(row.gapMinutes)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white">
                  <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Per cliente</div>
                  <div className="divide-y divide-black/10">
                    {(weeklySummary?.byClient ?? []).map((client) => (
                      <div key={client.clientName} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{client.clientName}</div>
                          <div className="text-xs text-black/50">{client.totalEntries} attivita</div>
                        </div>
                        <div className="text-sm font-semibold">{formatMinutes(client.totalMinutes)}</div>
                      </div>
                    ))}
                    {(weeklySummary?.byClient ?? []).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-black/50">Nessuna attivita.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Smart grouping (cliente + rif/titolo)</div>
                <div className="divide-y divide-black/10">
                  {(weeklySummary?.groups ?? []).slice(0, 10).map((group) => (
                    <div key={`${group.clientName}-${group.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{group.clientName}</div>
                        <div className="text-xs text-black/50">{group.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatMinutes(group.totalMinutes)}</div>
                        <div className="text-xs text-black/50">{group.totalEntries} voci</div>
                      </div>
                    </div>
                  ))}
                  {(weeklySummary?.groups ?? []).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-black/50">Nessun raggruppamento disponibile.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'month' && (
            <section className="mt-8 space-y-6">
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-black/10 bg-white p-5 lg:col-span-2">
                  <div className="text-xs uppercase text-black/50">Colpo d'occhio mese</div>
                  <div className="mt-2 text-xl font-semibold">{monthRange.label}</div>
                  <div className="mt-3 text-sm text-black/70">
                    Totale: {formatMinutes(monthlySummary?.totalMinutes ?? 0)} · {monthlySummary?.totalEntries ?? 0} voci
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-black/10">
                    <div className="h-2 rounded-full bg-teal" style={{ width: `${monthProgress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-black/50">Progresso target mensile</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white" onClick={handleExportMonth}>
                      Esporta XLSX
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Gap mese</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(monthGapMinutes)}</div>
                  <div className="mt-2 text-xs text-black/50">Target: {formatMinutes(monthTargetMinutes)}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xs uppercase text-black/50">Top cliente</div>
                  <div className="mt-2 text-lg font-semibold">{monthTopClient?.clientName ?? 'N/D'}</div>
                  <div className="mt-2 text-sm text-black/70">
                    {monthTopClient ? formatMinutes(monthTopClient.totalMinutes) : '0h 0m'}
                  </div>
                  <div className="mt-4 text-xs text-black/50">
                    Giorno top: {monthHasData ? monthTopDay.label : 'N/D'} · {monthHasData ? formatMinutes(monthTopDay.totalMinutes) : '0h 0m'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-black/10 bg-white lg:col-span-2">
                  <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Per giorno</div>
                  <div className="grid gap-0 md:grid-cols-2">
                    {monthDailyRows.map((row) => (
                      <div key={row.date} className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{row.label}</div>
                          <div className="text-xs text-black/50">{row.totalEntries} attivita</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMinutes(row.totalMinutes)}</div>
                          <div className="text-xs text-amber">Gap {formatMinutes(row.gapMinutes)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white">
                  <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Per cliente</div>
                  <div className="divide-y divide-black/10">
                    {(monthlySummary?.byClient ?? []).map((client) => (
                      <div key={client.clientName} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{client.clientName}</div>
                          <div className="text-xs text-black/50">{client.totalEntries} attivita</div>
                        </div>
                        <div className="text-sm font-semibold">{formatMinutes(client.totalMinutes)}</div>
                      </div>
                    ))}
                    {(monthlySummary?.byClient ?? []).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-black/50">Nessuna attivita.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Smart grouping (cliente + rif/titolo)</div>
                <div className="divide-y divide-black/10">
                  {(monthlySummary?.groups ?? []).slice(0, 12).map((group) => (
                    <div key={`${group.clientName}-${group.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{group.clientName}</div>
                        <div className="text-xs text-black/50">{group.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatMinutes(group.totalMinutes)}</div>
                        <div className="text-xs text-black/50">{group.totalEntries} voci</div>
                      </div>
                    </div>
                  ))}
                  {(monthlySummary?.groups ?? []).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-black/50">Nessun raggruppamento disponibile.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'clients' && (
            <section className="mt-8">
              <div className="rounded-xl border border-black/10 bg-white">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Clienti</div>
                <div className="divide-y divide-black/10">
                  {clients.map((client) => (
                    <div key={client.id} className="px-4 py-3 text-sm">
                      {client.name}
                    </div>
                  ))}
                  {clients.length === 0 && <div className="px-4 py-10 text-center text-sm text-black/50">Nessun cliente.</div>}
                </div>
              </div>
            </section>
          )}

          {view === 'settings' && (
            <section className="mt-8">
              <div className="rounded-xl border border-black/10 bg-white">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">Backup e ripristino</div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-black/70">
                  <div>
                    <div className="font-semibold text-black">Backup automatico con rotazione</div>
                    <div className="text-xs text-black/50">Mantiene gli ultimi 10 backup nel profilo utente.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-black/10 px-4 py-2 text-xs" onClick={handleBackup}>
                      Crea backup
                    </button>
                    <button className="rounded-lg border border-black/10 px-4 py-2 text-xs" onClick={() => handleRestoreBackup()}>
                      Ripristina da file
                    </button>
                  </div>
                </div>
                <div className="border-t border-black/10 px-4 py-3 text-xs text-black/50">Backup disponibili</div>
                <div className="divide-y divide-black/10">
                  {backups.map((backup) => (
                    <div key={backup.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{backup.name}</div>
                        <div className="text-xs text-black/50">{backup.createdAt}</div>
                      </div>
                      <button
                        className="rounded-lg border border-black/10 px-3 py-2 text-xs"
                        onClick={() => handleRestoreBackup(backup.path)}
                      >
                        Ripristina
                      </button>
                    </div>
                  ))}
                  {backups.length === 0 && <div className="px-4 py-8 text-center text-sm text-black/50">Nessun backup.</div>}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="heading text-xl font-semibold">
                {editingId ? 'Modifica attivita' : 'Nuova attivita'}
              </h2>
              <button
                onClick={() => {
                  setEditingId(null);
                  setQuickAddOpen(false);
                }}
                className="text-sm text-black/50"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="mt-4 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  Data
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                    className="rounded-lg border border-black/10 px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Cliente
                  <input
                    type="text"
                    value={form.clientName ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
                    list="clienti"
                    className="rounded-lg border border-black/10 px-3 py-2"
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
                  className="rounded-lg border border-black/10 px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Descrizione
                <textarea
                  value={form.description ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-[90px] rounded-lg border border-black/10 px-3 py-2"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  Minuti
                  <input
                    type="number"
                    value={form.minutes}
                    onChange={(event) => setForm((prev) => ({ ...prev, minutes: Number(event.target.value) }))}
                    className="rounded-lg border border-black/10 px-3 py-2"
                    min={5}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Rif. verbale
                  <input
                    type="text"
                    value={form.referenceVerbale ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, referenceVerbale: event.target.value }))}
                    className="rounded-lg border border-black/10 px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Risorsa/ICON
                  <input
                    type="text"
                    value={form.resourceIcon ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, resourceIcon: event.target.value }))}
                    className="rounded-lg border border-black/10 px-3 py-2"
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
                  className="rounded-lg border border-black/10 px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.inGestore ?? false}
                    onChange={(event) => setForm((prev) => ({ ...prev, inGestore: event.target.checked }))}
                  />
                  Da inserire nel Gestore
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
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm"
                  onClick={() => {
                    setEditingId(null);
                    setQuickAddOpen(false);
                  }}
                >
                  Annulla
                </button>
                <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
