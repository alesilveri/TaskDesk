import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Loader2, X } from 'lucide-react';
import { currentDateKey } from '../../lib/date';
import type { ActivityInput } from '../../types';

interface QuickAddForm extends ActivityInput {
  clientName?: string;
}

const DEFAULT_FORM: QuickAddForm = {
  title: '',
  date: currentDateKey(),
  startTime: '',
  endTime: '',
  durationMinutes: 60,
  type: 'ticket',
  status: 'planned',
  billable: true,
  notes: '',
  tags: [],
  clientId: null,
  clientName: '',
};

export function QuickAddPage() {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [form, setForm] = useState<QuickAddForm>(DEFAULT_FORM);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const syncPreset = useCallback((preset?: Partial<ActivityInput>) => {
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      ...preset,
      date: preset.date || prev.date,
      title: preset.title ?? prev.title,
      notes: preset.notes ?? prev.notes,
      tags: preset.tags ?? prev.tags,
    }));
  }, []);

  useEffect(() => {
    if (!bridge?.window) {
      return undefined;
    }
    const unsubscribe = bridge.window.onQuickAddPreset((preset) => {
      syncPreset(preset);
    });
    return () => unsubscribe?.();
  }, [bridge, syncPreset]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!clientSearch.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        if (!bridge?.clients) return;
        const results = await bridge.clients.autocomplete(clientSearch.trim());
        setSuggestions(results);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [clientSearch]);

  const handleChange = (field: keyof QuickAddForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFeedback('Inserisci un titolo descrittivo');
      return;
    }
    if (!bridge?.activities) {
      setFeedback('Bridge non disponibile');
      return;
    }
    setLoading(true);
    try {
      const payload: ActivityInput = {
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        durationMinutes: form.durationMinutes,
        type: form.type || 'ticket',
        status: form.status || 'planned',
        billable: form.billable,
        notes: form.notes,
        tags: form.tags,
        clientId: form.clientId || undefined,
      };
      await bridge.activities.create({ ...payload, source: 'quick-add' });
      bridge.system?.notify?.({
        title: 'TaskDesk',
        body: 'Nuova attività registrata',
      });
      setFeedback('Attività registrata con successo');
      setForm(DEFAULT_FORM);
      setClientSearch('');
      setTimeout(() => bridge.window?.closeQuickAdd(), 400);
    } catch (err) {
      console.error(err);
      setFeedback('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSubmit();
      }
      if (event.key === 'Escape') {
        bridge?.window?.closeQuickAdd();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [bridge, handleSubmit]);

  const formTitle = useMemo(() => {
    if (form.title.trim()) return form.title;
    return 'Nuova attività rapida';
  }, [form.title]);

  return (
    <div className="flex h-full flex-col bg-[color:var(--td-bg)]">
      <header className="flex items-center justify-between border-b border-[color:var(--td-border)] px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">Quick Add</p>
          <h1 className="text-lg font-semibold text-[color:var(--td-text)]">{formTitle}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            window.api.window.closeQuickAdd();
          }}
          className="btn btn-ghost"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
          Titolo
          <input
            className="input"
            autoFocus
            placeholder="Esempio: Ticket assistenza cliente"
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Cliente
            <input
              className="input"
              placeholder="Digita per cercare…"
              value={clientSearch}
              onChange={(event) => {
                setClientSearch(event.target.value);
                handleChange('clientId', null);
                handleChange('clientName', event.target.value);
              }}
            />
            {suggestions.length > 0 ? (
              <div className="mt-1 rounded-lg border border-[color:var(--td-border)] bg-[color:var(--td-surface)]">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[color:var(--td-surface-muted)]"
                    onClick={() => {
                      setClientSearch(suggestion.name);
                      handleChange('clientId', suggestion.id);
                      setSuggestions([]);
                    }}
                  >
                    <span>{suggestion.name}</span>
                    <Check className="h-4 w-4 text-[color:var(--td-accent)]" />
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Data
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(event) => handleChange('date', event.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Inizio
            <input
              type="time"
              className="input"
              value={form.startTime ?? ''}
              onChange={(event) => handleChange('startTime', event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Fine
            <input
              type="time"
              className="input"
              value={form.endTime ?? ''}
              onChange={(event) => handleChange('endTime', event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Durata (min)
            <input
              type="number"
              className="input"
              min={0}
              step={15}
              value={form.durationMinutes}
              onChange={(event) => handleChange('durationMinutes', Number(event.target.value))}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Tipo
            <select
              className="input"
              value={form.type}
              onChange={(event) => handleChange('type', event.target.value)}
            >
              <option value="ticket">Ticket</option>
              <option value="assistenza">Assistenza</option>
              <option value="progetto">Progetto</option>
              <option value="formazione">Formazione</option>
              <option value="interno">Interno</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Stato
            <select
              className="input"
              value={form.status}
              onChange={(event) => handleChange('status', event.target.value)}
            >
              <option value="planned">Pianificata</option>
              <option value="in_progress">In corso</option>
              <option value="done">Completata</option>
              <option value="pending">In attesa</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-[color:var(--td-text)]">
          <input
            type="checkbox"
            checked={form.billable ?? true}
            onChange={(event) => handleChange('billable', event.target.checked)}
          />
          Attività fatturabile
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
          Note
          <textarea
            className="input"
            rows={3}
            value={form.notes ?? ''}
            onChange={(event) => handleChange('notes', event.target.value)}
            placeholder="Annotazioni rapide, riferimento ticket, TODO…"
          />
        </label>
      </div>

      <footer className="flex items-center justify-between border-t border-[color:var(--td-border)] px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-[color:var(--td-text-muted)]">
          <CalendarClock className="h-4 w-4" />
          <span>Ctrl/Cmd + S per salvare · Esc per chiudere</span>
        </div>
        <div className="flex items-center gap-2">
          {feedback ? <span className="text-xs text-[color:var(--td-text-muted)]">{feedback}</span> : null}
          <button type="button" className="btn btn-secondary" onClick={() => bridge?.window?.closeQuickAdd()}>
            Chiudi
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva
          </button>
        </div>
      </footer>
    </div>
  );
}
