import { useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { BarChart3, CalendarRange, FileSpreadsheet, Printer, ArrowLeft, ArrowRight } from 'lucide-react';
import { monthOffset, currentMonthKey, formatMonthLabel, formatMinutes, formatMinutesDecimal } from '../../lib/date';
import { useMonthlySummary } from '../../hooks/useMonthlySummary';
import type { LayoutOutletContext } from '../../app/AppLayout';

export function MonthPage() {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const params = useParams<{ month?: string }>();
  const navigate = useNavigate();
  const outlet = useOutletContext<LayoutOutletContext>();

  const selectedMonth = useMemo(() => params.month || currentMonthKey(), [params.month]);
  const { summary, loading } = useMonthlySummary(selectedMonth);

  const handleMonthChange = (offset: number) => {
    const next = monthOffset(selectedMonth, offset);
    navigate(`/month/${next}`);
  };

  const handleExcel = async () => {
    await bridge?.exports?.excel({ month: selectedMonth });
  };

  const handlePdf = async () => {
    await bridge?.exports?.pdf({ month: selectedMonth });
  };

  const perDay = summary?.perDay ?? [];
  const maxMinutes = perDay.reduce((max, day) => Math.max(max, day.totalMinutes), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">Riepilogo mensile</p>
          <h1 className="text-2xl font-semibold text-[color:var(--td-text)]">{formatMonthLabel(selectedMonth)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleMonthChange(-1)}
            title="Mese precedente"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleMonthChange(1)}
            title="Mese successivo"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => outlet.onQuickAdd()}>
            Nuova attività
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Ore totali</p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--td-text)]">
            {loading ? '...' : `${formatMinutesDecimal(summary?.totals.totalMinutes ?? 0)} h`}
          </p>
          <p className="text-xs text-[color:var(--td-text-muted)]">
            {summary?.totals.totalActivities ?? 0} attività registrate
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Ore fatturabili</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-500">
            {loading ? '...' : `${formatMinutesDecimal(summary?.totals.billableMinutes ?? 0)} h`}
          </p>
          <p className="text-xs text-[color:var(--td-text-muted)]">
            {formatMinutes(summary?.totals.nonBillableMinutes ?? 0)} non fatturabili
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Clienti serviti</p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--td-text)]">
            {loading ? '...' : summary?.totals.uniqueClients ?? 0}
          </p>
          <p className="text-xs text-[color:var(--td-text-muted)]">
            {summary?.totals.activeDays ?? 0} giorni attivi
          </p>
        </div>
        <div className="glass-panel flex flex-col gap-3 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--td-text-muted)]">Azioni</p>
          <button type="button" className="btn btn-secondary justify-start" onClick={handleExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Esporta in Excel
          </button>
          <button type="button" className="btn btn-secondary justify-start" onClick={handlePdf}>
            <Printer className="h-4 w-4" />
            Esporta in PDF
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="glass-panel flex flex-col gap-4 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Calendario produttività</h2>
              <p className="text-sm text-[color:var(--td-text-muted)]">Distribuzione ore per giorno</p>
            </div>
            <BarChart3 className="h-5 w-5 text-[color:var(--td-accent)]" />
          </div>
          <div className="flex flex-col gap-2">
            {perDay.length === 0 ? (
              <p className="text-sm text-[color:var(--td-text-muted)]">Nessuna attività registrata nel mese.</p>
            ) : (
              perDay.map((day) => {
                const ratio = maxMinutes ? Math.max(8, Math.round((day.totalMinutes / maxMinutes) * 100)) : 8;
                return (
                  <div key={day.date}>
                    <div className="flex items-center justify-between text-xs text-[color:var(--td-text-muted)]">
                      <span>{day.date}</span>
                      <span>{formatMinutes(day.totalMinutes)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[color:var(--td-border)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--td-accent)]"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel flex flex-col gap-4 p-5 lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Clienti principali</h2>
            <p className="text-sm text-[color:var(--td-text-muted)]">Focus sui primi 8 clienti per volume</p>
          </div>
          <div className="flex flex-col gap-3">
            {(summary?.topClients.slice(0, 8) ?? []).map((client) => (
              <div
                key={client.clientId}
                className="rounded-xl border border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[color:var(--td-text)]">
                  {client.clientName ?? 'Cliente non assegnato'}
                </p>
                <p className="text-xs text-[color:var(--td-text-muted)]">
                  {client.count} attività · {formatMinutesDecimal(client.totalMinutes)} h
                </p>
                <div className="mt-2 h-1 w-full rounded-full bg-[color:var(--td-border)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--td-accent)]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (client.totalMinutes / Math.max(1, summary?.totals.totalMinutes ?? 1)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Tipologia attività</h2>
          <div className="flex flex-col gap-2">
            {(summary?.byType ?? []).map((item) => (
              <div key={item.type} className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 hover:border-[color:var(--td-border)]">
                <div>
                  <p className="text-sm font-medium text-[color:var(--td-text)]">{item.type}</p>
                  <p className="text-xs text-[color:var(--td-text-muted)]">{item.count} attività</p>
                </div>
                <p className="text-sm font-semibold text-[color:var(--td-text)]">{formatMinutes(item.totalMinutes)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Tag ricorrenti</h2>
          <div className="flex flex-wrap gap-2">
            {(summary?.byTag ?? []).slice(0, 20).map((tag) => (
              <span key={tag.tag} className="chip is-active">
                {tag.tag} · {formatMinutes(tag.totalMinutes)}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
