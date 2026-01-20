import { useState } from 'react';
import { HardDrive, Keyboard, Moon, MonitorCog, Sun } from 'lucide-react';
import { useThemeContext } from '../../app/ThemeProvider';

const THEME_ITEMS = [
  { value: 'light', label: 'Tema chiaro', description: 'Palette ottimizzata per ambienti luminosi', icon: Sun },
  { value: 'dark', label: 'Tema scuro', description: 'Contrasto elevato per ambienti bui', icon: Moon },
  { value: 'system', label: 'Segui sistema', description: 'Si adatta alla preferenza del sistema operativo', icon: MonitorCog },
] as const;

export function SettingsPage() {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const { preference, setPreference, theme } = useThemeContext();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
      if (!bridge?.backup) {
        setFeedback('Backup non disponibile');
        return;
      }
      const filePath = await bridge.backup.create();
      setFeedback(`Backup creato: ${filePath}`);
    } catch (err) {
      console.error(err);
      setFeedback('Errore durante la creazione del backup');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">Preferenze</p>
        <h1 className="text-2xl font-semibold text-[color:var(--td-text)]">Impostazioni TaskDesk</h1>
        <p className="mt-1 text-sm text-[color:var(--td-text-muted)]">
          Personalizza il comportamento dell’applicazione, i temi e le scorciatoie principali.
        </p>
      </header>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Tema applicazione</h2>
        <p className="text-sm text-[color:var(--td-text-muted)]">Scegli l’aspetto che preferisci per TaskDesk.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {THEME_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = preference === item.value || (preference === 'system' && theme === item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setPreference(item.value)}
                className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? 'border-[color:var(--td-accent)] bg-[color:var(--td-accent-soft)] text-[color:var(--td-text)] shadow-soft'
                    : 'border-[color:var(--td-border)] bg-[color:var(--td-surface)] hover:border-[color:var(--td-accent)]'
                }`}
              >
                <Icon className="h-5 w-5 text-[color:var(--td-accent)]" />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-[color:var(--td-text-muted)]">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Backup e integrazione</h2>
        <p className="text-sm text-[color:var(--td-text-muted)]">
          Effettua una copia di sicurezza del database SQLite e conserva gli archivi operativi.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={handleBackup}>
            <HardDrive className="h-4 w-4" />
            Crea backup immediato
          </button>
          {feedback ? <span className="text-xs text-[color:var(--td-text-muted)]">{feedback}</span> : null}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold text-[color:var(--td-text)]">Scorciatoie principali</h2>
        <p className="text-sm text-[color:var(--td-text-muted)]">
          Ottimizza il flusso operativo con i comandi rapidi integrati.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            { combo: 'Ctrl / Cmd + Shift + N', description: 'Apri la finestra Quick Add per registrare una nuova attività' },
            { combo: 'Ctrl / Cmd + N', description: 'Crea un’attività direttamente dalla dashboard' },
            { combo: 'Ctrl / Cmd + S', description: 'Salva l’attività in Quick Add' },
            { combo: 'Menu Tray → Backup rapido', description: 'Salva una copia di sicurezza del database' },
          ].map((shortcut) => (
            <div key={shortcut.combo} className="flex items-start gap-3 rounded-2xl border border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] p-4">
              <Keyboard className="mt-1 h-5 w-5 text-[color:var(--td-accent)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--td-text)]">{shortcut.combo}</p>
                <p className="text-xs text-[color:var(--td-text-muted)]">{shortcut.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
