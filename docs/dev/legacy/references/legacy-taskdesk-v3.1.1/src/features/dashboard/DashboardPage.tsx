import { Fragment, useMemo } from 'react';
import { Clock3, Users2, CalendarCheck2, ArrowRightCircle, TrendingUp } from 'lucide-react';
import { currentDateKey, currentMonthKey, formatDayName, formatMinutes, formatMinutesDecimal } from '../../lib/date';
import { useDailySummary } from '../../hooks/useDailySummary';
import { useMonthlySummary } from '../../hooks/useMonthlySummary';
import type { Activity } from '../../types';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: 'blue' | 'green' | 'orange';
}) {
  const color =
    accent === 'green'
      ? 'text-emerald-500 bg-emerald-500/12'
      : accent === 'orange'
      ? 'text-amber-500 bg-amber-500/12'
      : 'text-blue-500 bg-blue-500/12';
  return (
    <div className="glass-panel flex flex-col gap-2 p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.26em] text-[color:var(--td-text-muted)]">{label}</p>
        <p className="text-2xl font-semibold text-[color:var(--td-text)]">{value}</p>
        {hint ? <p className="text-xs text-[color:var(--td-text-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--td-border)] bg-[color:var(--td-surface)] px-4 py-3 transition hover:border-[color:var(--td-accent)]">
      <div>
        <p className="text-sm font-semibold text-[color:var(--td-text)]">{activity.title}</p>
        <p className="text-xs text-[color:var(--td-text-muted)]">
          {activity.startTime && activity.endTime ? `${activity.startTime} → ${activity.endTime}` : 'Durata stimata'} ·{' '}
          {formatMinutes(activity.durationMinutes)}
        </p>
        {activity.clientName ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[color:var(--td-text-muted)]">
            <Users2 className="h-3 w-3" />
            {activity.clientName}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className={`tag ${activity.billable ? 'tag-billable' : 'tag-nonbillable'}`}>
          {activity.billable ? 'Fatt.' : 'Non fatt.'}
        </span>
        <span className="rounded-full bg-[color:var(--td-surface-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:var(--td-text-muted)]">
          {activity.type}
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const todayKey = useMemo(() => currentDateKey(), []);
  const monthKey = useMemo(() => currentMonthKey(), []);

  const { snapshot, loading: loadingDay } = useDailySummary(todayKey);
  const { summary: monthSummary, loading: loadingMonth } = useMonthlySummary(monthKey);

  const todayActivities = snapshot?.activities ?? [];
  const topClients = monthSummary?.topClients.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">
            {formatDayName(todayKey)}
          </p>
          <h1 className="text-3xl font-semibold text-[color:var(--td-text)]">Benvenuto su TaskDesk</h1>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Ore oggi"
          value={loadingDay ? '...' : formatMinutesDecimal(snapshot?.totalMinutes ?? 0)}
          hint="Totale attività registrate"
        />
        <StatCard
          icon={TrendingUp}
          label="Ore fatturabili"
          value={loadingDay ? '...' : formatMinutesDecimal(snapshot?.billableMinutes ?? 0)}
          hint="Giornata in corso"
          accent="green"
        />
        <StatCard
          icon={Users2}
          label="Clienti seguiti"
          value={loadingDay ? '...' : String(snapshot?.uniqueClients ?? 0)}
          hint="Clienti lavorati oggi"
          accent="orange"
        />
        <StatCard
          icon={CalendarCheck2}
          label="Giorni attivi mese"
          value={loadingMonth ? '...' : String(monthSummary?.totals.activeDays ?? 0)}
          hint="Copertura operativo mese corrente"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--td-text)]">Timeline giornata</h3>
              <p className="text-sm text-[color:var(--td-text-muted)]">
                Attività programmate e completate nella data odierna
              </p>
            </div>
            <span className="pill">{todayActivities.length} registrazioni</span>
          </div>
          <div className="flex flex-col gap-3">
            {loadingDay ? (
              <p className="text-sm text-[color:var(--td-text-muted)]">Caricamento in corso…</p>
            ) : todayActivities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] p-6 text-sm text-[color:var(--td-text-muted)]">
                Nessuna attività inserita per oggi. Usa il Quick Add (Ctrl/Cmd + Shift + N) per registrare rapidamente.
              </div>
            ) : (
              todayActivities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)
            )}
          </div>
        </div>

        <div className="glass-panel flex flex-1 flex-col gap-5 p-5">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--td-text)]">Focus mese corrente</h3>
            <p className="text-sm text-[color:var(--td-text-muted)]">
              Riepilogo rapido sui clienti principali e sul tempo impiegato.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] p-4">
              <div>
                <p className="text-sm text-[color:var(--td-text-muted)]">Ore totali mese</p>
                <p className="text-xl font-semibold text-[color:var(--td-text)]">
                  {loadingMonth ? '...' : formatMinutesDecimal(monthSummary?.totals.totalMinutes ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[color:var(--td-text-muted)]">Fatturabili</p>
                <p className="font-semibold text-emerald-500">
                  {loadingMonth ? '...' : formatMinutesDecimal(monthSummary?.totals.billableMinutes ?? 0)} h
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--td-border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">
                Clienti caldi
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {loadingMonth ? (
                  <p className="text-sm text-[color:var(--td-text-muted)]">Calcolo in corso…</p>
                ) : topClients.length === 0 ? (
                  <p className="text-sm text-[color:var(--td-text-muted)]">Nessun dato disponibile per il mese.</p>
                ) : (
                  topClients.map((client) => (
                    <Fragment key={client.clientId}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[color:var(--td-text)]">
                            {client.clientName ?? 'Cliente non assegnato'}
                          </span>
                          <span className="text-xs text-[color:var(--td-text-muted)]">
                            {client.count} attività · {formatMinutesDecimal(client.totalMinutes)} h
                          </span>
                        </div>
                        <ArrowRightCircle className="h-4 w-4 text-[color:var(--td-border)]" />
                      </div>
                      <div className="h-1 w-full rounded-full bg-[color:var(--td-border)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--td-accent)] transition-all"
                          style={{
                            width: `${Math.min(100, (client.totalMinutes / (monthSummary?.totals.totalMinutes || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </Fragment>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

