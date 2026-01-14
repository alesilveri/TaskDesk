import { Outlet } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSidebar } from '../components/AppSidebar';
import { HeaderBar } from '../components/HeaderBar';
import { currentMonthKey } from '../lib/date';

export interface LayoutOutletContext {
  onExportPdf: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  onQuickAdd: () => void;
}

interface ToastState {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'error';
}

export function AppLayout() {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [toast, setToast] = useState<ToastState | null>(null);
  const currentMonth = useMemo(() => currentMonthKey(), []);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'info') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const prettyPath = useCallback((filePath: string) => {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleQuickAdd = useCallback(() => {
    bridge?.window?.openQuickAdd();
  }, [bridge]);

  const handleExportExcel = useCallback(async () => {
    try {
      const filePath = bridge?.exports ? await bridge.exports.excel({ month: currentMonth }) : null;
      if (!filePath) return;
      showToast(`Excel salvato: ${prettyPath(filePath)}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Errore durante l\'esportazione Excel', 'error');
    }
  }, [bridge, currentMonth, prettyPath, showToast]);

  const handleExportPdf = useCallback(async () => {
    try {
      const filePath = bridge?.exports ? await bridge.exports.pdf({ month: currentMonth }) : null;
      if (!filePath) return;
      showToast(`PDF salvato: ${prettyPath(filePath)}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Errore durante l\'esportazione PDF', 'error');
    }
  }, [bridge, currentMonth, prettyPath, showToast]);

  const handleBackup = useCallback(async () => {
    try {
      if (!bridge?.backup) {
        showToast('Backup non disponibile in questa modalità', 'error');
        return;
      }
      const destination = await bridge.backup.create();
      if (!destination) return;
      showToast(`Backup creato: ${prettyPath(destination)}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Impossibile creare il backup', 'error');
    }
  }, [bridge, prettyPath, showToast]);

  useEffect(() => {
    if (!bridge?.commands) {
      return () => {};
    }
    const unsubExcel = bridge.commands.onExportExcel(handleExportExcel);
    const unsubPdf = bridge.commands.onExportPdf(handleExportPdf);
    return () => {
      unsubExcel?.();
      unsubPdf?.();
    };
  }, [bridge, handleExportExcel, handleExportPdf]);

  return (
    <div className="flex h-full w-full">
      <AppSidebar onQuickAdd={handleQuickAdd} />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar onQuickAdd={handleQuickAdd} onExportExcel={handleExportExcel} onBackup={handleBackup} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 scrollbar-thin">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6">
            <Outlet
              context={
                {
                  onExportPdf: handleExportPdf,
                  onExportExcel: handleExportExcel,
                  onQuickAdd: handleQuickAdd,
                } satisfies LayoutOutletContext
              }
            />
          </div>
        </main>
      </div>

      {toast ? (
        <div
          key={toast.id}
          className={`fixed bottom-6 right-6 w-80 rounded-xl border border-[color:var(--td-border)] bg-[color:var(--td-surface)] px-4 py-3 shadow-soft transition ${
            toast.tone === 'success'
              ? 'border-green-400/50'
              : toast.tone === 'error'
              ? 'border-red-400/50'
              : ''
          }`}
        >
          <p className="text-sm text-[color:var(--td-text)]">{toast.message}</p>
        </div>
      ) : null}
    </div>
  );
}
