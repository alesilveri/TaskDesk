import type { MonthlySummary } from '../types';
import { buildMonthGrid } from '../utils/calendar';
import { formatMinutes } from '../utils/time';

type MonthViewProps = {
  monthKey: string;
  monthRange: { start: string; end: string; label: string };
  targetMinutes: number;
  workingDaysPerWeek: 5 | 6 | 7;
  monthTargetMinutes: number;
  monthGapMinutes: number;
  monthProgress: number;
  monthTopClient: { clientName: string; totalMinutes: number } | null;
  monthTopDay: { date: string; label: string; totalMinutes: number; totalEntries: number; gapMinutes: number };
  monthTopActivities: { clientName: string; label: string; totalMinutes: number; totalEntries: number }[];
  monthDailyRows: { date: string; label: string; totalMinutes: number; totalEntries: number; gapMinutes: number }[];
  monthWorkingDaysMissing: number;
  monthSuggestedDaily: number;
  monthlySummary: MonthlySummary | null;
  onExportMonth: () => void;
  onCopyGestore: () => void;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function heatColor(totalMinutes: number, targetMinutes: number) {
  if (totalMinutes <= 0) return 'rgb(var(--color-ink) / 0.05)';
  const ratio = Math.min(totalMinutes / targetMinutes, 1);
  const alpha = 0.15 + ratio * 0.55;
  return `rgb(var(--color-teal) / ${alpha})`;
}

export default function MonthView({
  monthKey,
  monthRange,
  targetMinutes,
  workingDaysPerWeek,
  monthTargetMinutes,
  monthGapMinutes,
  monthProgress,
  monthTopClient,
  monthTopDay,
  monthTopActivities,
  monthDailyRows,
  monthWorkingDaysMissing,
  monthSuggestedDaily,
  monthlySummary,
  onExportMonth,
  onCopyGestore,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MonthViewProps) {
  const monthHasData = (monthlySummary?.totalEntries ?? 0) > 0;
  const monthWeeks = buildMonthGrid(monthKey, monthDailyRows, targetMinutes, workingDaysPerWeek);

  return (
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
            <button className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white" onClick={onExportMonth}>
              Esporta XLSX
            </button>
            <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={onCopyGestore}>
              Copia Gestore (raggruppata)
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-surface p-4">
          <div className="text-xs uppercase text-ink/50">Gap mese</div>
          <div className="mt-2 text-2xl font-semibold text-amber">{formatMinutes(monthGapMinutes)}</div>
          <div className="mt-2 text-xs text-ink/50">Target: {formatMinutes(monthTargetMinutes)}</div>
          <div className="mt-4 text-xs text-ink/60">
            Giorni incompleti: <span className="font-semibold">{monthWorkingDaysMissing}</span>
          </div>
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
        <div className="rounded-xl border border-ink/10 bg-surface p-4 lg:col-span-2">
          <div className="flex items-center justify-between text-xs text-ink/60">
            <span className="uppercase">Calendario mese</span>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-ink/10 px-2 py-1" onClick={onPrevMonth}>
                Prev
              </button>
              <button className="rounded-lg border border-ink/10 px-2 py-1" onClick={onNextMonth}>
                Next
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-ink/60">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((label) => (
              <div key={label} className="text-center font-semibold">
                {label}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthWeeks.flat().map((day) => {
              const isMissing = day.totalMinutes === 0 && day.isWorkingDay && day.isCurrentMonth;
              const baseStyle = day.isCurrentMonth ? heatColor(day.totalMinutes, targetMinutes) : 'rgb(var(--color-ink) / 0.03)';
              return (
                <button
                  key={day.date}
                  className={`rounded-lg border px-2 py-2 text-xs ${
                    day.isCurrentMonth ? 'border-ink/10' : 'border-transparent text-ink/30'
                  } ${isMissing ? 'border-amber/60' : ''} ${day.isToday ? 'ring-2 ring-teal/60' : ''}`}
                  style={{ backgroundColor: baseStyle }}
                  title={`${day.date} - ${formatMinutes(day.totalMinutes)} (${day.totalEntries} voci)`}
                  onClick={() => onSelectDate(day.date)}
                >
                  <div className="flex items-center justify-between text-ink/70">
                    <span className={!day.isWorkingDay ? 'text-ink/40' : ''}>{day.label}</span>
                    {isMissing && <span className="text-amber">!</span>}
                  </div>
                  <div className="mt-2 text-[11px] text-ink/60">{day.totalMinutes ? formatMinutes(day.totalMinutes) : '--'}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-ink/50">
            I giorni con bordo ambra indicano gap completo su giorni lavorativi.
          </div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-surface lg:col-span-1">
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
        <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Raggruppamenti (cliente + rif/titolo)</div>
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
  );
}
