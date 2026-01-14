import { useMemo } from 'react';
import { Sun, Moon, MonitorCog, Plus, Download, HardDrive } from 'lucide-react';
import { currentMonthKey, formatMonthLabel } from '../lib/date';
import { useThemeContext } from '../app/ThemeProvider';

interface HeaderBarProps {
  onQuickAdd: () => void;
  onExportExcel: () => void;
  onBackup: () => void;
  rightSlot?: React.ReactNode;
}

const THEME_OPTIONS = [
  { value: 'light' as const, icon: Sun, label: 'Chiaro' },
  { value: 'dark' as const, icon: Moon, label: 'Scuro' },
  { value: 'system' as const, icon: MonitorCog, label: 'Sistema' },
];

export function HeaderBar({ onQuickAdd, onExportExcel, onBackup, rightSlot }: HeaderBarProps) {
  const { preference, theme, setPreference } = useThemeContext();

  const monthLabel = useMemo(() => formatMonthLabel(currentMonthKey()), []);

  return (
    <header className="flex h-20 flex-none items-center justify-between gap-6 border-b border-[color:var(--td-border)] bg-[color:var(--td-bg)]/80 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.32em] text-[color:var(--td-text-muted)]">TaskDesk</span>
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold text-[color:var(--td-text)]">Dashboard Operativa</h2>
          <span className="badge">{monthLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {rightSlot}

        <button type="button" onClick={onExportExcel} className="btn btn-secondary hidden lg:inline-flex">
          <Download className="h-4 w-4" />
          Esporta mese
        </button>
        <button type="button" onClick={onBackup} className="btn btn-secondary hidden lg:inline-flex">
          <HardDrive className="h-4 w-4" />
          Backup
        </button>
        <button type="button" onClick={onQuickAdd} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nuova attività
        </button>

        <div className="flex items-center gap-1 rounded-full border border-[color:var(--td-border)] bg-[color:var(--td-surface)] px-2 py-1">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = preference === option.value || (option.value !== 'system' && preference === 'system' && theme === option.value);
            return (
              <button
                key={option.value}
                type='button'
                onClick={() => setPreference(option.value)}
                title={`Tema ${option.label}`}
                className={`rounded-full p-1.5 transition ${
                  isActive ? 'bg-[color:var(--td-accent)] text-white shadow-soft' : 'text-[color:var(--td-text-muted)] hover:bg-[color:var(--td-surface-muted)]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

