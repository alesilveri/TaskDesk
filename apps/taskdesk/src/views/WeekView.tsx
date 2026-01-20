import type { WeeklySummary } from '../types';
import { formatMinutes } from '../utils/time';

type WeekViewProps = {
  weekRange: { start: string; end: string; label: string };
  weekTargetMinutes: number;
  weekGapMinutes: number;
  weeklySummary: WeeklySummary | null;
  onCopyWeek: () => void;
  weekDailyRows: {
    date: string;
    label: string;
    totalMinutes: number;
    totalEntries: number;
    gapMinutes: number;
  }[];
};

export default function WeekView({
  weekRange,
  weekTargetMinutes,
  weekGapMinutes,
  weeklySummary,
  onCopyWeek,
  weekDailyRows,
}: WeekViewProps) {
  return (
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
          <button className="mt-4 rounded-lg border border-ink/10 px-3 py-2 text-xs" onClick={onCopyWeek}>
            Copia formato Gestore
          </button>
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
  );
}
