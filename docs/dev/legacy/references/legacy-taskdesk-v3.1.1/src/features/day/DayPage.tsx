import { useMemo, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { CalendarIcon, Clock, Timer } from 'lucide-react';
import { formatDayName, formatMinutes, currentDateKey } from '../../lib/date';
import { useDailySummary } from '../../hooks/useDailySummary';
import { useActivities } from '../../hooks/useActivities';
import type { Activity } from '../../types';
import type { LayoutOutletContext } from '../../app/AppLayout';

export function DayPage() {
  const params = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const outletContext = useOutletContext<LayoutOutletContext>();

  const initialDate = useMemo(() => params.date || currentDateKey(), [params.date]);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const { snapshot, loading } = useDailySummary(selectedDate);
  const { activities } = useActivities({ startDate: selectedDate, endDate: selectedDate });

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    navigate(`/day/${value}`);
  };

  const dayActivities = useMemo(() => {
    return activities.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [activities]);

  const handleQuickAdd = () => {
    outletContext.onQuickAdd();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">Giorno operativo</p>
          <h1 className="text-2xl font-semibold text-[color:var(--td-text)]">{formatDayName(selectedDate)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            className="input input-muted w-[180px]"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={handleQuickAdd}>
            Nuova attività
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel flex items-start gap-3 p-4">
          <CalendarIcon className="mt-1 h-5 w-5 text-[color:var(--td-accent)]" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Attività del giorno</p>
            <p className="text-2xl font-semibold text-[color:var(--td-text)]">{snapshot?.totalActivities ?? 0}</p>
            <p className="text-xs text-[color:var(--td-text-muted)]">Registrazioni totali</p>
          </div>
        </div>
        <div className="glass-panel flex items-start gap-3 p-4">
          <Clock className="mt-1 h-5 w-5 text-green-500" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Ore fatturabili</p>
            <p className="text-2xl font-semibold text-green-500">{formatMinutes(snapshot?.billableMinutes ?? 0)}</p>
            <p className="text-xs text-[color:var(--td-text-muted)]">Tempo rendicontabile</p>
          </div>
        </div>
        <div className="glass-panel flex items-start gap-3 p-4">
          <Timer className="mt-1 h-5 w-5 text-amber-500" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Ore non fatturabili</p>
            <p className="text-2xl font-semibold text-amber-500">{formatMinutes(snapshot?.nonBillableMinutes ?? 0)}</p>
            <p className="text-xs text-[color:var(--td-text-muted)]">Tempo interno / supporto</p>
          </div>
        </div>
      </section>

      <section className="glass-panel flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Registro attività</h2>
            <p className="text-sm text-[color:var(--td-text-muted)]">Dettaglio puntuale delle attività pianificate e svolte.</p>
          </div>
          <span className="pill">{dayActivities.length} elementi</span>
        </div>
        {loading ? (
          <p className="text-sm text-[color:var(--td-text-muted)]">Sto recuperando i dati della giornata…</p>
        ) : dayActivities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] p-6 text-sm text-[color:var(--td-text-muted)]">
            Nessuna attività registrata per questa data.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[color:var(--td-border)]">
            <table className="table-grid">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Orario</th>
                  <th style={{ width: '28%' }}>Titolo</th>
                  <th style={{ width: '24%' }}>Cliente</th>
                  <th style={{ width: '14%' }}>Durata</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {dayActivities.map((activity: Activity) => (
                  <tr key={activity.id}>
                    <td>
                      <div className="text-sm text-[color:var(--td-text)]">
                        {activity.startTime ? `${activity.startTime}` : 'n.d.'}
                        {activity.endTime ? ` → ${activity.endTime}` : ''}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-[color:var(--td-text-muted)]">
                        {activity.status}
                      </div>
                    </td>
                    <td className="text-sm font-medium text-[color:var(--td-text)]">{activity.title}</td>
                    <td className="text-sm text-[color:var(--td-text-muted)]">{activity.clientName ?? '—'}</td>
                    <td className="text-sm text-[color:var(--td-text)]">{formatMinutes(activity.durationMinutes)}</td>
                    <td className="text-sm text-[color:var(--td-text-muted)]">{activity.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

