import { useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, endOfISOWeek, endOfMonth, format, isWeekend, parseISO, startOfISOWeek, startOfMonth } from 'date-fns';
import type {
  Activity,
  ActivityHistory,
  ActivityInput,
  ActivityStatus,
  ActivityTemplate,
  AppSettings,
  BackupInfo,
  Client,
  DailySummary,
  MonthlySummary,
  WeeklySummary,
} from './types';
import DayView from './views/DayView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import SearchView from './views/SearchView';
import ClientsView from './views/ClientsView';
import SettingsView from './views/SettingsView';
import CommandPalette, { type CommandAction } from './components/CommandPalette';
import QuickAddModal from './components/QuickAddModal';
import { countWorkingDays, DEFAULT_TARGET_MINUTES, formatMinutes } from './utils/time';
import { getActivityWarnings, validateActivityInput } from './utils/validation';

type View = 'day' | 'week' | 'month' | 'search' | 'clients' | 'settings';

const emptyInput: ActivityInput = {
  date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  minutes: 30,
  status: 'bozza',
  inGestore: false,
  verbaleDone: false,
};

const viewLabels: Record<View, string> = {
  day: 'Giorno',
  week: 'Settimana',
  month: 'Mese',
  search: 'Ricerca',
  clients: 'Clienti',
  settings: 'Impostazioni',
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export default function App() {
  const [view, setView] = useState<View>('day');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [form, setForm] = useState<ActivityInput>({ ...emptyInput });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityHistory[]>([]);
  const [patternMinutes, setPatternMinutes] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const targetMinutes = settings?.dailyTargetMinutes ?? DEFAULT_TARGET_MINUTES;

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
    () => countWorkingDays(weekRange.start, weekRange.end) * targetMinutes,
    [weekRange.start, weekRange.end, targetMinutes]
  );
  const weekGapMinutes = Math.max(weekTargetMinutes - (weeklySummary?.totalMinutes ?? 0), 0);

  const monthTargetMinutes = useMemo(
    () => countWorkingDays(monthRange.start, monthRange.end) * targetMinutes,
    [monthRange.start, monthRange.end, targetMinutes]
  );
  const monthGapMinutes = Math.max(monthTargetMinutes - (monthlySummary?.totalMinutes ?? 0), 0);

  const monthProgress = useMemo(() => {
    if (!monthTargetMinutes) return 0;
    return Math.min(((monthlySummary?.totalMinutes ?? 0) / monthTargetMinutes) * 100, 100);
  }, [monthlySummary?.totalMinutes, monthTargetMinutes]);

  const monthTopClient = useMemo(() => {
    return monthlySummary?.byClient?.[0] ?? null;
  }, [monthlySummary?.byClient]);

  const monthTopActivities = useMemo(() => {
    return (monthlySummary?.groups ?? []).slice(0, 6);
  }, [monthlySummary?.groups]);

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
        gapMinutes: Math.max(targetMinutes - (summary?.totalMinutes ?? 0), 0),
      };
    });
  }, [weekRange.start, weekRange.end, weeklySummary?.byDay, targetMinutes]);

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
        gapMinutes: Math.max(targetMinutes - (summary?.totalMinutes ?? 0), 0),
      };
    });
  }, [monthRange.start, monthRange.end, monthlySummary?.byDay, targetMinutes]);

  const monthTopDay = useMemo(() => {
    return monthDailyRows.reduce(
      (best, item) => (item.totalMinutes > best.totalMinutes ? item : best),
      { date: '', label: '', totalMinutes: 0, totalEntries: 0, gapMinutes: 0 }
    );
  }, [monthDailyRows]);

  const monthWorkingDaysMissing = useMemo(() => {
    return monthDailyRows.filter((row) => row.totalMinutes === 0 && !isWeekend(parseISO(row.date))).length;
  }, [monthDailyRows]);

  const monthSuggestedDaily = useMemo(() => {
    if (monthWorkingDaysMissing === 0) return 0;
    return Math.ceil(monthGapMinutes / monthWorkingDaysMissing);
  }, [monthGapMinutes, monthWorkingDaysMissing]);

  const paletteActions: CommandAction[] = [
    { id: 'day', label: 'Vai a Giorno', shortcut: 'Ctrl+1', onSelect: () => setView('day') },
    { id: 'week', label: 'Vai a Settimana', shortcut: 'Ctrl+2', onSelect: () => setView('week') },
    { id: 'month', label: 'Vai a Mese', shortcut: 'Ctrl+3', onSelect: () => setView('month') },
    { id: 'search', label: 'Vai a Ricerca', shortcut: 'Ctrl+4', onSelect: () => setView('search') },
    { id: 'clients', label: 'Vai a Clienti', shortcut: 'Ctrl+5', onSelect: () => setView('clients') },
    { id: 'settings', label: 'Vai a Impostazioni', shortcut: 'Ctrl+6', onSelect: () => setView('settings') },
    {
      id: 'quick-add',
      label: 'Nuova attivita',
      shortcut: 'Ctrl+N',
      onSelect: () => openQuickAdd(),
    },
    {
      id: 'export',
      label: 'Esporta mese (XLSX)',
      shortcut: 'Ctrl+E',
      onSelect: () => handleExportMonth(),
    },
    {
      id: 'copy-gestore',
      label: 'Copia formato Gestore',
      shortcut: 'Ctrl+Shift+C',
      onSelect: () => handleCopyGestore(),
    },
  ];

  useEffect(() => {
    window.api.ui.onNavigate((target) => {
      if (target === 'day' || target === 'week' || target === 'month' || target === 'search' || target === 'clients' || target === 'settings') {
        setView(target);
      }
    });
    window.api.ui.onQuickAdd(() => {
      openQuickAdd();
    });
    window.api.ui.onExport(() => {
      handleExportMonth();
    });
    window.api.ui.onCopyGestore(() => {
      handleCopyGestore();
    });
    window.api.ui.onResetFilters(() => {
      setView('search');
    });
  }, []);

  useEffect(() => {
    window.api.settings.get().then((data) => {
      setSettings(data);
      applyTheme(data.theme);
    });
    window.api.clients.list().then(setClients);
    window.api.clients.recent().then(setRecentClients);
    window.api.templates.list().then(setTemplates);
    window.api.summaries.patterns(60).then(setPatternMinutes);
  }, []);

  useEffect(() => {
    if (settings?.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [settings?.theme]);

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
    if (view === 'settings') {
      loadBackups();
    }
  }, [view]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key === '1') setView('day');
        if (event.key === '2') setView('week');
        if (event.key === '3') setView('month');
        if (event.key === '4') setView('search');
        if (event.key === '5') setView('clients');
        if (event.key === '6') setView('settings');
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          openQuickAdd();
        }
        if (event.key.toLowerCase() === 'e') {
          event.preventDefault();
          handleExportMonth();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [monthKey, selectedDate]);

  useEffect(() => {
    setFormError(null);
  }, [form.title, form.minutes, form.date, quickAddOpen]);

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

  async function refreshClients() {
    const list = await window.api.clients.list();
    const recent = await window.api.clients.recent();
    setClients(list);
    setRecentClients(recent);
  }

  async function refreshTemplates() {
    const list = await window.api.templates.list();
    setTemplates(list);
  }

  function applyTheme(theme: AppSettings['theme']) {
    if (theme === 'system') {
      window.api.system.theme().then((systemTheme) => {
        document.documentElement.dataset.theme = systemTheme;
      });
      return;
    }
    document.documentElement.dataset.theme = theme;
  }

  function openQuickAdd() {
    setEditingId(null);
    setHistory([]);
    setForm({ ...emptyInput, date: selectedDate });
    setQuickAddOpen(true);
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
      status: activity.status,
      inGestore: activity.inGestore,
      verbaleDone: activity.verbaleDone,
    });
    window.api.activities.history(activity.id).then(setHistory);
    setQuickAddOpen(true);
  }

  function openDuplicate(activity: Activity) {
    setEditingId(null);
    setHistory([]);
    setForm({
      date: activity.date,
      clientName: activity.clientName ?? undefined,
      title: activity.title,
      description: activity.description ?? undefined,
      minutes: activity.minutes,
      referenceVerbale: activity.referenceVerbale ?? undefined,
      resourceIcon: activity.resourceIcon ?? undefined,
      tags: activity.tags,
      status: activity.status,
      inGestore: activity.inGestore,
      verbaleDone: activity.verbaleDone,
    });
    setQuickAddOpen(true);
  }

  async function handleCreateActivity(event: React.FormEvent) {
    event.preventDefault();
    const resolvedStatus: ActivityStatus = form.status ?? (form.inGestore ? 'inserita' : 'bozza');
    const payload: ActivityInput = {
      ...form,
      date: form.date || selectedDate,
      minutes: Number(form.minutes),
      tags: form.tags?.length ? form.tags : undefined,
      status: resolvedStatus,
      inGestore: form.inGestore ?? resolvedStatus === 'inserita',
    };
    const errors = validateActivityInput(payload);
    if (errors.length > 0) {
      setFormError(errors.join(' '));
      return;
    }
    try {
      if (editingId) {
        await window.api.activities.update(editingId, payload);
      } else {
        await window.api.activities.create(payload);
      }
      setForm({ ...emptyInput, date: selectedDate });
      setEditingId(null);
      setHistory([]);
      setQuickAddOpen(false);
      await loadDay();
      await refreshClients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Errore durante il salvataggio.');
    }
  }

  async function handleTemplateApply(template: ActivityTemplate) {
    setEditingId(null);
    setHistory([]);
    setForm({
      date: selectedDate,
      title: template.title,
      clientName: template.clientName ?? undefined,
      description: template.description ?? undefined,
      minutes: template.minutes,
      referenceVerbale: template.referenceVerbale ?? undefined,
      resourceIcon: template.resourceIcon ?? undefined,
      tags: template.tags,
      status: 'bozza',
      inGestore: false,
      verbaleDone: false,
    });
    setQuickAddOpen(true);
    await window.api.templates.use(template.id);
    refreshTemplates();
  }

  async function handleSaveTemplate() {
    const errors = validateActivityInput(form);
    if (errors.length > 0) {
      setFormError(errors.join(' '));
      return;
    }
    await window.api.templates.create({
      ...form,
      date: form.date || selectedDate,
      minutes: Number(form.minutes),
      status: form.status ?? 'bozza',
    });
    refreshTemplates();
    window.api.system.notify({ title: 'Preset salvato', body: 'Preset aggiunto alla libreria.' });
  }

  async function handleDeleteTemplate(id: string) {
    await window.api.templates.remove(id);
    refreshTemplates();
  }

  async function handleDelete(id: string) {
    await window.api.activities.remove(id);
    loadDay();
  }

  function handleDeleteFromSearch(_id: string) {
    loadDay();
  }

  async function handleExportMonth() {
    const result = await window.api.exports.monthly(monthKey);
    if (result) {
      window.api.system.notify({ title: 'Export completato', body: `File creato: ${result}` });
    }
  }

  async function handleCopyGestore() {
    const text = await window.api.exports.monthlyCopy(monthKey);
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    window.api.system.notify({ title: 'Copia completata', body: 'Formato Gestore copiato negli appunti.' });
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
    refreshClients();
    refreshTemplates();
    window.api.summaries.weekly(weekRange.start, weekRange.end).then(setWeeklySummary);
    window.api.summaries.monthly(monthKey).then(setMonthlySummary);
    loadBackups();
    window.api.system.notify({ title: 'Backup ripristinato', body: 'Dati aggiornati con successo.' });
  }

  async function handleThemeChange(nextTheme: AppSettings['theme']) {
    const updated = await window.api.settings.set({ theme: nextTheme });
    setSettings(updated);
    applyTheme(updated.theme);
  }

  async function handleSettingsUpdate(partial: Partial<AppSettings>) {
    const updated = await window.api.settings.set(partial);
    setSettings(updated);
  }

  async function handleBackupDirChoose() {
    const dir = await window.api.backup.chooseDir();
    if (dir !== null) {
      const updated = await window.api.settings.get();
      setSettings(updated);
      loadBackups();
    }
  }

  const formWarnings = getActivityWarnings(form, targetMinutes);

  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-ink/10 bg-surface px-6 py-6">
          <div className="heading text-2xl font-semibold">TaskDesk</div>
          <p className="mt-1 text-sm text-ink/50">Registro attivita smart</p>

          <nav className="mt-8 space-y-2 text-sm">
            {(Object.keys(viewLabels) as View[]).map((id) => (
              <button
                key={id}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                  view === id ? 'bg-ink text-white' : 'hover:bg-ink/5'
                }`}
                onClick={() => setView(id)}
                aria-current={view === id ? 'page' : undefined}
              >
                {viewLabels[id]}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-ink/10 bg-amber/10 p-4">
            <div className="text-xs uppercase text-ink/50">Gap giorno</div>
            <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(Math.max(targetMinutes - (dailySummary?.totalMinutes ?? 0), 0))}</div>
            <div className="mt-2 text-xs text-ink/50">Target: {formatMinutes(targetMinutes)}</div>
          </div>

          <button
            className="mt-6 w-full rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white"
            onClick={openQuickAdd}
          >
            + Nuova attivita
          </button>
          <button
            className="mt-3 w-full rounded-lg border border-ink/10 px-4 py-2 text-sm"
            onClick={() => setPaletteOpen(true)}
          >
            Command palette
          </button>
        </aside>

        <main className="px-10 py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="heading text-3xl font-semibold">{viewLabels[view]}</h1>
              <p className="mt-1 text-sm text-ink/50">{selectedDate}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), -1), 'yyyy-MM-dd'))}
              >
                Ieri
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
              />
              <button
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
              >
                Domani
              </button>
            </div>
          </header>

          {view === 'day' && (
            <DayView
              activities={activities}
              dailySummary={dailySummary}
              targetMinutes={targetMinutes}
              patternMinutes={patternMinutes}
              templates={templates}
              onOpenEdit={openEdit}
              onDuplicate={openDuplicate}
              onDelete={handleDelete}
              onTemplateApply={handleTemplateApply}
              onRefreshDay={loadDay}
              onRefreshClients={refreshClients}
              onOpenSettings={() => setView('settings')}
            />
          )}

          {view === 'week' && (
            <WeekView
              weekRange={weekRange}
              weekTargetMinutes={weekTargetMinutes}
              weekGapMinutes={weekGapMinutes}
              weeklySummary={weeklySummary}
              weekDailyRows={weekDailyRows}
            />
          )}

          {view === 'month' && (
            <MonthView
              monthKey={monthKey}
              monthRange={monthRange}
              targetMinutes={targetMinutes}
              monthTargetMinutes={monthTargetMinutes}
              monthGapMinutes={monthGapMinutes}
              monthProgress={monthProgress}
              monthTopClient={monthTopClient}
              monthTopDay={monthTopDay}
              monthTopActivities={monthTopActivities}
              monthDailyRows={monthDailyRows}
              monthWorkingDaysMissing={monthWorkingDaysMissing}
              monthSuggestedDaily={monthSuggestedDaily}
              monthlySummary={monthlySummary}
              onExportMonth={handleExportMonth}
              onCopyGestore={handleCopyGestore}
            />
          )}

          {view === 'search' && <SearchView onOpenEdit={openEdit} onDelete={handleDeleteFromSearch} />}

          {view === 'clients' && (
            <ClientsView clients={clients} recentClients={recentClients} onRefreshClients={refreshClients} />
          )}

          {view === 'settings' && (
            <SettingsView
              settings={settings}
              targetMinutes={targetMinutes}
              templates={templates}
              backups={backups}
              onTemplateApply={handleTemplateApply}
              onDeleteTemplate={handleDeleteTemplate}
              onBackup={handleBackup}
              onRestoreBackup={handleRestoreBackup}
              onBackupDirChoose={handleBackupDirChoose}
              onOpenBackupDir={() => window.api.backup.openDir()}
              onThemeChange={handleThemeChange}
              onSettingsUpdate={handleSettingsUpdate}
            />
          )}
        </main>
      </div>

      <QuickAddModal
        open={quickAddOpen}
        title={editingId ? 'Modifica attivita' : 'Nuova attivita'}
        form={form}
        setForm={setForm}
        clients={clients}
        history={history}
        formError={formError}
        warnings={formWarnings}
        onClose={() => {
          setEditingId(null);
          setHistory([]);
          setQuickAddOpen(false);
        }}
        onSubmit={handleCreateActivity}
        onSaveTemplate={handleSaveTemplate}
      />

      <CommandPalette open={paletteOpen} actions={paletteActions} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
