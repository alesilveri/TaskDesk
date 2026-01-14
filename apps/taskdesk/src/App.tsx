import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfISOWeek,
  endOfMonth,
  format,
  isWeekend,
  parseISO,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns';
import { FixedSizeList as List } from 'react-window';
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

const defaultTargetMinutes = 8 * 60;
const minuteSuggestions = [15, 20, 30, 45];
const smartSlotCandidates = [10, 15, 20, 25];

type View = 'day' | 'week' | 'month' | 'search' | 'clients' | 'settings';

type InlineEditState = {
  title: string;
  clientName: string;
  minutes: number;
  status: ActivityStatus;
};

const emptyInput: ActivityInput = {
  date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  minutes: 30,
  status: 'bozza',
  inGestore: false,
  verbaleDone: false,
};

const defaultSearchFilters = {
  text: '',
  client: '',
  status: 'all' as ActivityStatus | 'all',
  startDate: '',
  endDate: '',
  onlyNotInserted: false,
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

function buildSmartSlots(gapMinutes: number, patterns: number[]) {
  if (gapMinutes <= 0) return [];
  const ordered = smartSlotCandidates
    .slice()
    .sort((a, b) => {
      const aScore = patterns.indexOf(a);
      const bScore = patterns.indexOf(b);
      if (aScore === -1 && bScore === -1) return b - a;
      if (aScore === -1) return 1;
      if (bScore === -1) return -1;
      return aScore - bScore;
    });

  const slots: number[] = [];
  let remaining = gapMinutes;
  while (remaining >= 10) {
    const candidate = ordered.find((value) => value <= Math.min(25, remaining)) ?? 10;
    slots.push(candidate);
    remaining -= candidate;
    if (slots.length > 8) break;
  }
  return slots;
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
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [history, setHistory] = useState<ActivityHistory[]>([]);
  const [searchFilters, setSearchFilters] = useState({ ...defaultSearchFilters });
  const [searchResults, setSearchResults] = useState<Activity[]>([]);
  const [patternMinutes, setPatternMinutes] = useState<number[]>([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [csvPath, setCsvPath] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSample, setCsvSample] = useState<Record<string, string>[]>([]);
  const [csvColumn, setCsvColumn] = useState<string>('');
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);

  const targetMinutes = settings?.dailyTargetMinutes ?? defaultTargetMinutes;

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
  const gapMinutes = Math.max(targetMinutes - totalMinutes, 0);

  const filteredActivities = useMemo(() => {
    const term = quickFilter.trim().toLowerCase();
    if (!term) return activities;
    return activities.filter((activity) => {
      const haystack = [
        activity.title,
        activity.clientName ?? '',
        activity.description ?? '',
        activity.referenceVerbale ?? '',
        activity.resourceIcon ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [activities, quickFilter]);

  const dayAnomalies = useMemo(() => {
    const counts = new Map<number, number>();
    activities.forEach((activity) => {
      counts.set(activity.minutes, (counts.get(activity.minutes) ?? 0) + 1);
    });
    const repeated = Array.from(counts.entries())
      .filter(([minutes, count]) => minutes >= 60 && count >= 3)
      .map(([minutes, count]) => ({ minutes, count }));
    return repeated;
  }, [activities]);

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

  const monthHasData = (monthlySummary?.totalEntries ?? 0) > 0;
  const smartSlots = useMemo(() => buildSmartSlots(gapMinutes, patternMinutes), [gapMinutes, patternMinutes]);

  const monthWorkingDaysMissing = useMemo(() => {
    return monthDailyRows.filter((row) => row.totalMinutes === 0 && !isWeekend(parseISO(row.date))).length;
  }, [monthDailyRows]);

  const monthSuggestedDaily = useMemo(() => {
    if (monthWorkingDaysMissing === 0) return 0;
    return Math.ceil(monthGapMinutes / monthWorkingDaysMissing);
  }, [monthGapMinutes, monthWorkingDaysMissing]);
  useEffect(() => {
    window.api.ui.onNavigate((target) => {
      if (target === 'day' || target === 'week' || target === 'month' || target === 'search' || target === 'clients' || target === 'settings') {
        setView(target);
      }
    });
    window.api.ui.onQuickAdd(() => {
      setEditingId(null);
      setHistory([]);
      setForm({ ...emptyInput, date: format(new Date(), 'yyyy-MM-dd') });
      setQuickAddOpen(true);
    });
    window.api.ui.onExport(() => {
      handleExportMonth();
    });
    window.api.ui.onCopyGestore(() => {
      handleCopyGestore();
    });
    window.api.ui.onResetFilters(() => {
      setSearchFilters({ ...defaultSearchFilters });
      setSearchResults([]);
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

  async function loadDay() {
    setInlineEditId(null);
    setInlineEdit(null);
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

  async function handleCreateActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const resolvedStatus: ActivityStatus = form.status ?? (form.inGestore ? 'inserita' : 'bozza');
    const payload: ActivityInput = {
      ...form,
      date: form.date || selectedDate,
      minutes: Number(form.minutes),
      tags: form.tags?.length ? form.tags : undefined,
      status: resolvedStatus,
      inGestore: form.inGestore ?? resolvedStatus === 'inserita',
    };
    if (editingId) {
      await window.api.activities.update(editingId, payload);
    } else {
      await window.api.activities.create(payload);
    }
    setForm({ ...emptyInput, date: selectedDate });
    setEditingId(null);
    setHistory([]);
    setQuickAddOpen(false);
    loadDay();
    refreshClients();
  }

  function openEdit(activity: Activity) {
    cancelInlineEdit();
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
    cancelInlineEdit();
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

  function startInlineEdit(activity: Activity) {
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
  }

  async function saveInlineEdit() {
    if (!inlineEditId || !inlineEdit) return;
    await window.api.activities.update(inlineEditId, {
      title: inlineEdit.title,
      clientName: inlineEdit.clientName,
      minutes: inlineEdit.minutes,
      status: inlineEdit.status,
    });
    cancelInlineEdit();
    loadDay();
    refreshClients();
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
    if (!form.title.trim()) return;
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

  async function handleSearch() {
    const results = await window.api.activities.search(searchFilters);
    setSearchResults(results);
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
    refreshClients();
  }

  const dayRowSize = 160;
  const dayListHeight = Math.min(520, Math.max(240, filteredActivities.length * dayRowSize));
  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-ink/10 bg-surface px-6 py-6">
          <div className="heading text-2xl font-semibold">TaskDesk</div>
          <p className="mt-1 text-sm text-ink/50">Registro attivita smart</p>

          <nav className="mt-8 space-y-2 text-sm">
            {([
              { id: 'day', label: 'Giorno' },
              { id: 'week', label: 'Settimana' },
              { id: 'month', label: 'Mese' },
              { id: 'search', label: 'Ricerca' },
              { id: 'clients', label: 'Clienti' },
              { id: 'settings', label: 'Impostazioni' },
            ] as { id: View; label: string }[]).map((item) => (
              <button
                key={item.id}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                  view === item.id ? 'bg-ink text-white' : 'hover:bg-ink/5'
                }`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-ink/10 bg-amber/10 p-4">
            <div className="text-xs uppercase text-ink/50">Gap giorno</div>
            <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(gapMinutes)}</div>
            <div className="mt-2 text-xs text-ink/50">Target: {formatMinutes(targetMinutes)}</div>
          </div>

          <button
            className="mt-6 w-full rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setEditingId(null);
              setHistory([]);
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
                {view === 'search' && 'Ricerca'}
                {view === 'clients' && 'Clienti'}
                {view === 'settings' && 'Impostazioni'}
              </h1>
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
            <section className="mt-8 space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Totale giorno</div>
                  <div className="mt-2 text-2xl font-semibold">{formatMinutes(totalMinutes)}</div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Numero attivita</div>
                  <div className="mt-2 text-2xl font-semibold">{dailySummary?.totalEntries ?? 0}</div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Gap</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(gapMinutes)}</div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Smart filler</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {smartSlots.length === 0 && <span className="text-xs text-ink/50">Gap chiuso</span>}
                    {smartSlots.map((slot, index) => (
                      <span key={`${slot}-${index}`} className="rounded-full bg-ink/5 px-3 py-1 text-xs">
                        {slot}m
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-ink/10 bg-surface p-4 lg:col-span-2">
                  <div className="text-xs uppercase text-ink/50">Ricerca rapida</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={quickFilter}
                      onChange={(event) => setQuickFilter(event.target.value)}
                      placeholder="Cerca titolo, cliente, rif, risorsa"
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm md:w-auto md:flex-1"
                    />
                    <button
                      className="rounded-lg border border-ink/10 px-3 py-2 text-xs"
                      onClick={() => setQuickFilter('')}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-ink/50">
                    {filteredActivities.length} risultati su {activities.length} attivita
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Preset rapidi</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {templates.slice(0, 6).map((template) => (
                      <button
                        key={template.id}
                        className="rounded-full bg-ink/5 px-3 py-1 text-xs"
                        onClick={() => handleTemplateApply(template)}
                      >
                        {template.title}
                      </button>
                    ))}
                    {templates.length === 0 && <span className="text-xs text-ink/50">Nessun preset salvato.</span>}
                  </div>
                  <button
                    className="mt-3 text-xs text-ink/60"
                    onClick={() => setView('settings')}
                  >
                    Gestisci preset
                  </button>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface p-4">
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

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Attivita del giorno</div>
                {filteredActivities.length > 0 ? (
                  <List height={dayListHeight} itemCount={filteredActivities.length} itemSize={dayRowSize} width="100%">
                    {({ index, style }) => {
                      const activity = filteredActivities[index];
                      return (
                        <div
                          key={activity.id}
                          style={style}
                          className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 px-4 py-4"
                          onDoubleClick={() => openEdit(activity)}
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
                                    min={5}
                                    value={inlineEdit.minutes}
                                    onChange={(event) =>
                                      setInlineEdit((prev) =>
                                        prev ? { ...prev, minutes: Number(event.target.value) } : prev
                                      )
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
                                  <button className="text-ink/70" onClick={() => openEdit(activity)}>
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
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <button className="text-ink/70" onClick={() => startInlineEdit(activity)}>
                                  Modifica inline
                                </button>
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
          )}
          {view === 'week' && (
            <section className="mt-8 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Settimana ISO</div>
                  <div className="mt-2 text-xl font-semibold">{weekRange.label}</div>
                  <div className="mt-3 text-sm text-ink/70">
                    Totale: {formatMinutes(weeklySummary?.totalMinutes ?? 0)} - {weeklySummary?.totalEntries ?? 0} voci
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Target settimana</div>
                  <div className="mt-2 text-2xl font-semibold">{formatMinutes(weekTargetMinutes)}</div>
                  <div className="mt-2 text-xs text-ink/50">Giorni lavorativi ISO</div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Gap settimana</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(weekGapMinutes)}</div>
                  <div className="mt-2 text-xs text-ink/50">Smart gap rispetto target</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-ink/10 bg-surface lg:col-span-2">
                  <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Per giorno</div>
                  <div className="divide-y divide-black/10">
                    {weekDailyRows.map((row) => (
                      <div key={row.date} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{row.label}</div>
                          <div className="text-xs text-ink/50">{row.totalEntries} attivita</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMinutes(row.totalMinutes)}</div>
                          <div className="text-xs text-amber">Gap {formatMinutes(row.gapMinutes)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface">
                  <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Per cliente</div>
                  <div className="divide-y divide-black/10">
                    {(weeklySummary?.byClient ?? []).map((client) => (
                      <div key={client.clientName} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{client.clientName}</div>
                          <div className="text-xs text-ink/50">{client.totalEntries} attivita</div>
                        </div>
                        <div className="text-sm font-semibold">{formatMinutes(client.totalMinutes)}</div>
                      </div>
                    ))}
                    {(weeklySummary?.byClient ?? []).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-ink/50">Nessuna attivita.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Smart grouping (cliente + rif/titolo)</div>
                <div className="divide-y divide-black/10">
                  {(weeklySummary?.groups ?? []).slice(0, 10).map((group) => (
                    <div key={`${group.clientName}-${group.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{group.clientName}</div>
                        <div className="text-xs text-ink/50">{group.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatMinutes(group.totalMinutes)}</div>
                        <div className="text-xs text-ink/50">{group.totalEntries} voci</div>
                      </div>
                    </div>
                  ))}
                  {(weeklySummary?.groups ?? []).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun raggruppamento disponibile.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'month' && (
            <section className="mt-8 space-y-6">
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-ink/10 bg-surface p-5 lg:col-span-2">
                  <div className="text-xs uppercase text-ink/50">Colpo d'occhio mese</div>
                  <div className="mt-2 text-xl font-semibold">{monthRange.label}</div>
                  <div className="mt-3 text-sm text-ink/70">
                    Totale: {formatMinutes(monthlySummary?.totalMinutes ?? 0)} - {monthlySummary?.totalEntries ?? 0} voci
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-ink/10">
                    <div className="h-2 rounded-full bg-teal" style={{ width: `${monthProgress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-ink/50">Progresso target mensile</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white" onClick={handleExportMonth}>
                      Esporta XLSX
                    </button>
                    <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={handleCopyGestore}>
                      Copia formato Gestore
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Gap mese</div>
                  <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(monthGapMinutes)}</div>
                  <div className="mt-2 text-xs text-ink/50">Target: {formatMinutes(monthTargetMinutes)}</div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Top cliente</div>
                  <div className="mt-2 text-lg font-semibold">{monthTopClient?.clientName ?? 'N/D'}</div>
                  <div className="mt-2 text-sm text-ink/70">
                    {monthTopClient ? formatMinutes(monthTopClient.totalMinutes) : '0h 0m'}
                  </div>
                  <div className="mt-4 text-xs text-ink/50">
                    Giorno top: {monthHasData ? monthTopDay.label : 'N/D'} - {monthHasData ? formatMinutes(monthTopDay.totalMinutes) : '0h 0m'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-ink/10 bg-surface lg:col-span-2">
                  <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Per giorno</div>
                  <div className="grid gap-0 md:grid-cols-2">
                    {monthDailyRows.map((row) => (
                      <div key={row.date} className="flex items-center justify-between border-b border-ink/10 px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{row.label}</div>
                          <div className="text-xs text-ink/50">{row.totalEntries} attivita</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMinutes(row.totalMinutes)}</div>
                          <div className="text-xs text-amber">Gap {formatMinutes(row.gapMinutes)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface">
                  <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Per cliente</div>
                  <div className="divide-y divide-black/10">
                    {(monthlySummary?.byClient ?? []).map((client) => (
                      <div key={client.clientName} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{client.clientName}</div>
                          <div className="text-xs text-ink/50">{client.totalEntries} attivita</div>
                        </div>
                        <div className="text-sm font-semibold">{formatMinutes(client.totalMinutes)}</div>
                      </div>
                    ))}
                    {(monthlySummary?.byClient ?? []).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-ink/50">Nessuna attivita.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-surface">
                  <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Top attivita</div>
                  <div className="divide-y divide-black/10">
                    {monthTopActivities.map((group) => (
                      <div key={`${group.clientName}-${group.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{group.label}</div>
                          <div className="text-xs text-ink/50">{group.clientName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatMinutes(group.totalMinutes)}</div>
                          <div className="text-xs text-ink/50">{group.totalEntries} voci</div>
                        </div>
                      </div>
                    ))}
                    {monthTopActivities.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-ink/50">Nessuna attivita.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Smart grouping (cliente + rif/titolo)</div>
                <div className="divide-y divide-black/10">
                  {(monthlySummary?.groups ?? []).slice(0, 12).map((group) => (
                    <div key={`${group.clientName}-${group.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{group.clientName}</div>
                        <div className="text-xs text-ink/50">{group.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatMinutes(group.totalMinutes)}</div>
                        <div className="text-xs text-ink/50">{group.totalEntries} voci</div>
                      </div>
                    </div>
                  ))}
                  {(monthlySummary?.groups ?? []).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun raggruppamento disponibile.</div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-ink/10 bg-surface p-4">
                  <div className="text-xs uppercase text-ink/50">Consigli chiusura mese</div>
                  <div className="mt-3 text-sm text-ink/70">
                    Giorni lavorativi mancanti: <span className="font-semibold">{monthWorkingDaysMissing}</span>
                  </div>
                  <div className="mt-2 text-sm text-ink/70">
                    Ore mancanti: <span className="font-semibold">{formatMinutes(monthGapMinutes)}</span>
                  </div>
                  <div className="mt-2 text-xs text-ink/50">
                    Proposta distribuzione: {monthSuggestedDaily ? `${monthSuggestedDaily}m / giorno` : 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-surface p-4 lg:col-span-2">
                  <div className="text-xs uppercase text-ink/50">Checklist chiusura mese</div>
                  <ul className="mt-3 grid gap-2 text-sm text-ink/70">
                    <li>Verifica attivita non inserite</li>
                    <li>Esporta XLSX e copia formato Gestore</li>
                    <li>Controlla gap residuo e distribuzione</li>
                    <li>Backup finale del mese</li>
                  </ul>
                </div>
              </div>
            </section>
          )}
          {view === 'search' && (
            <section className="mt-8 space-y-4">
              <div className="rounded-xl border border-ink/10 bg-surface p-4">
                <div className="grid gap-4 md:grid-cols-6">
                  <label className="grid gap-2 text-sm md:col-span-2">
                    Testo
                    <input
                      type="text"
                      value={searchFilters.text}
                      onChange={(event) => setSearchFilters((prev) => ({ ...prev, text: event.target.value }))}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-2 text-sm md:col-span-2">
                    Cliente
                    <input
                      type="text"
                      value={searchFilters.client}
                      onChange={(event) => setSearchFilters((prev) => ({ ...prev, client: event.target.value }))}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    Da
                    <input
                      type="date"
                      value={searchFilters.startDate}
                      onChange={(event) => setSearchFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    A
                    <input
                      type="date"
                      value={searchFilters.endDate}
                      onChange={(event) => setSearchFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    Stato
                    <select
                      value={searchFilters.status}
                      onChange={(event) =>
                        setSearchFilters((prev) => ({ ...prev, status: event.target.value as ActivityStatus | 'all' }))
                      }
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
                      checked={searchFilters.onlyNotInserted}
                      onChange={(event) => setSearchFilters((prev) => ({ ...prev, onlyNotInserted: event.target.checked }))}
                    />
                    Non ancora inserite
                  </label>
                  <button className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white" onClick={handleSearch}>
                    Cerca
                  </button>
                  <button
                    className="rounded-lg border border-ink/10 px-4 py-2 text-xs"
                    onClick={() => {
                      setSearchFilters({ ...defaultSearchFilters });
                      setSearchResults([]);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">
                  Risultati ({searchResults.length})
                </div>
                <div className="divide-y divide-black/10">
                  {searchResults.map((activity) => (
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
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button className="text-ink/70" onClick={() => openEdit(activity)}>
                          Modifica
                        </button>
                        <button className="text-danger" onClick={() => handleDelete(activity.id)}>
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-ink/50">Nessun risultato.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'clients' && (
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
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(event) => handleCsvInspect(event.target.files?.[0] ?? null)}
                  />
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
          )}

          {view === 'settings' && (
            <section className="mt-8 space-y-6">
              <div className="rounded-xl border border-ink/10 bg-surface p-4">
                <div className="text-sm font-semibold">Impostazioni generali</div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <label className="grid gap-2 text-sm">
                    Target giornaliero (min)
                    <input
                      type="number"
                      min={60}
                      value={settings?.dailyTargetMinutes ?? targetMinutes}
                      onChange={(event) => handleSettingsUpdate({ dailyTargetMinutes: Number(event.target.value) })}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    Promemoria gap (min)
                    <input
                      type="number"
                      min={0}
                      value={settings?.gapReminderMinutes ?? 60}
                      onChange={(event) => handleSettingsUpdate({ gapReminderMinutes: Number(event.target.value) })}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    />
                    <span className="text-xs text-ink/50">0 per disattivare</span>
                  </label>
                  <label className="grid gap-2 text-sm">
                    Tema
                    <select
                      value={settings?.theme ?? 'system'}
                      onChange={(event) => handleThemeChange(event.target.value as AppSettings['theme'])}
                      className="rounded-lg border border-ink/10 px-3 py-2"
                    >
                      <option value="system">Sistema</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings?.autoStart ?? false}
                      onChange={(event) => handleSettingsUpdate({ autoStart: event.target.checked })}
                    />
                    Avvio automatico
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Preset attivita</div>
                <div className="divide-y divide-black/10">
                  {templates.map((template) => (
                    <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{template.title}</div>
                        <div className="text-xs text-ink/50">
                          {template.clientName ?? 'Nessun cliente'} - {template.minutes} min
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button className="text-ink/70" onClick={() => handleTemplateApply(template)}>
                          Usa
                        </button>
                        <button className="text-danger" onClick={() => handleDeleteTemplate(template.id)}>
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun preset salvato.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Backup e ripristino</div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 text-sm text-ink/70">
                  <div>
                    Cartella backup: <span className="font-semibold">{settings?.backupDir ?? 'Default (profilo utente)'}</span>
                  </div>
                  <button className="rounded-lg border border-ink/10 px-3 py-2 text-xs" onClick={handleBackupDirChoose}>
                    Scegli cartella
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink/70">
                  <div>
                    <div className="font-semibold text-ink">Backup automatico con rotazione</div>
                    <div className="text-xs text-ink/50">Mantiene gli ultimi 10 backup nel profilo utente.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={handleBackup}>
                      Crea backup
                    </button>
                    <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={() => handleRestoreBackup()}>
                      Ripristina da file
                    </button>
                    <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={() => window.api.backup.openDir()}>
                      Apri cartella
                    </button>
                  </div>
                </div>
                <div className="border-t border-ink/10 px-4 py-3 text-xs text-ink/50">Backup disponibili</div>
                <div className="divide-y divide-black/10">
                  {backups.map((backup) => (
                    <div key={backup.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{backup.name}</div>
                        <div className="text-xs text-ink/50">{backup.createdAt}</div>
                      </div>
                      <button
                        className="rounded-lg border border-ink/10 px-3 py-2 text-xs"
                        onClick={() => handleRestoreBackup(backup.path)}
                      >
                        Ripristina
                      </button>
                    </div>
                  ))}
                  {backups.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun backup.</div>}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="heading text-xl font-semibold">{editingId ? 'Modifica attivita' : 'Nuova attivita'}</h2>
              <button
                onClick={() => {
                  setEditingId(null);
                  setHistory([]);
                  setQuickAddOpen(false);
                }}
                className="text-sm text-ink/50"
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
                    min={5}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {minuteSuggestions.map((value) => (
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
                <button
                  type="button"
                  className="rounded-lg border border-ink/10 px-4 py-2 text-sm"
                  onClick={() => {
                    setEditingId(null);
                    setHistory([]);
                    setQuickAddOpen(false);
                  }}
                >
                  Annulla
                </button>
                <button type="button" className="rounded-lg border border-ink/10 px-4 py-2 text-sm" onClick={handleSaveTemplate}>
                  Salva preset
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
