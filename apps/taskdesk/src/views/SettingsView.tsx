import type { ActivityTemplate, AppSettings, BackupInfo } from '../types';

export type SettingsViewProps = {
  settings: AppSettings | null;
  targetMinutes: number;
  weekTargetMinutes: number;
  workingDaysPerWeek: 5 | 6 | 7;
  templates: ActivityTemplate[];
  backups: BackupInfo[];
  onTemplateApply: (template: ActivityTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onBackup: () => void;
  onRestoreBackup: (backupPath?: string) => void;
  onBackupDirChoose: () => void;
  onOpenBackupDir: () => void;
  onThemeChange: (theme: AppSettings['theme']) => void;
  onSettingsUpdate: (partial: Partial<AppSettings>) => void;
};

export default function SettingsView({
  settings,
  targetMinutes,
  weekTargetMinutes,
  workingDaysPerWeek,
  templates,
  backups,
  onTemplateApply,
  onDeleteTemplate,
  onBackup,
  onRestoreBackup,
  onBackupDirChoose,
  onOpenBackupDir,
  onThemeChange,
  onSettingsUpdate,
}: SettingsViewProps) {
  return (
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
              onChange={(event) => onSettingsUpdate({ dailyTargetMinutes: Number(event.target.value) })}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Giorni lavorativi/settimana
            <select
              value={workingDaysPerWeek}
              onChange={(event) => onSettingsUpdate({ workingDaysPerWeek: Number(event.target.value) as 5 | 6 | 7 })}
              className="rounded-lg border border-ink/10 px-3 py-2"
            >
              <option value={5}>5 (lun-ven)</option>
              <option value={6}>6 (lun-sab)</option>
              <option value={7}>7 (tutti)</option>
            </select>
            <span className="text-xs text-ink/50">Target settimanale: {weekTargetMinutes} min</span>
          </label>
          <label className="grid gap-2 text-sm">
            Promemoria gap (min)
            <input
              type="number"
              min={0}
              value={settings?.gapReminderMinutes ?? 60}
              onChange={(event) => onSettingsUpdate({ gapReminderMinutes: Number(event.target.value) })}
              className="rounded-lg border border-ink/10 px-3 py-2"
            />
            <span className="text-xs text-ink/50">0 per disattivare</span>
          </label>
          <label className="grid gap-2 text-sm">
            Tema
            <select
              value={settings?.theme ?? 'system'}
              onChange={(event) => onThemeChange(event.target.value as AppSettings['theme'])}
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
              onChange={(event) => onSettingsUpdate({ autoStart: event.target.checked })}
            />
            Avvio automatico
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.trayEnabled ?? true}
              onChange={(event) => onSettingsUpdate({ trayEnabled: event.target.checked })}
            />
            Tray attivo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.hotkeyEnabled ?? true}
              onChange={(event) => onSettingsUpdate({ hotkeyEnabled: event.target.checked })}
            />
            Hotkey Quick Add
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
                <button className="text-ink/70" onClick={() => onTemplateApply(template)}>
                  Usa
                </button>
                <button className="text-danger" onClick={() => onDeleteTemplate(template.id)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun preset salvato.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-surface">
        <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold">Backup e ripristino</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 text-sm text-ink/70">
          <div>
            Cartella backup: <span className="font-semibold">{settings?.backupDir ?? 'Default (profilo utente)'}</span>
          </div>
          <button className="rounded-lg border border-ink/10 px-3 py-2 text-xs" onClick={onBackupDirChoose}>
            Scegli cartella
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink/70">
          <div>
            <div className="font-semibold text-ink">Backup automatico con rotazione</div>
            <div className="text-xs text-ink/50">Mantiene gli ultimi 10 backup nel profilo utente.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={onBackup}>
              Crea backup
            </button>
            <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={() => onRestoreBackup()}>
              Ripristina da file
            </button>
            <button className="rounded-lg border border-ink/10 px-4 py-2 text-xs" onClick={onOpenBackupDir}>
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
              <button className="rounded-lg border border-ink/10 px-3 py-2 text-xs" onClick={() => onRestoreBackup(backup.path)}>
                Ripristina
              </button>
            </div>
          ))}
          {backups.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink/50">Nessun backup.</div>}
        </div>
      </div>
    </section>
  );
}
