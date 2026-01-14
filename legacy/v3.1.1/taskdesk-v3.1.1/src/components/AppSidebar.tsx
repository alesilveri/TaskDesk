import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  Settings,
  Plus,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  onQuickAdd: () => void;
}

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/day', label: 'Giorno', icon: CalendarDays },
  { to: '/month', label: 'Mese', icon: CalendarRange },
  { to: '/clients', label: 'Clienti', icon: Users },
  { to: '/settings', label: 'Impostazioni', icon: Settings },
];

export function AppSidebar({ onQuickAdd }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="hidden h-full w-64 flex-none border-r border-[color:var(--td-border)] bg-[color:var(--td-surface)]/90 p-6 backdrop-blur md:flex md:flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-[color:var(--td-text-muted)]">
            TaskDesk
          </span>
          <h1 className="text-xl font-semibold text-[color:var(--td-text)]">Operations Hub</h1>
        </div>
        <Briefcase className="h-6 w-6 text-[color:var(--td-accent)]" />
      </div>

      <button
        type="button"
        onClick={onQuickAdd}
        className="btn btn-primary w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Nuova attività
      </button>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_LINKS.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-[color:var(--td-accent-soft)] text-[color:var(--td-accent)]'
                  : 'text-[color:var(--td-text-muted)] hover:bg-[color:var(--td-surface-muted)] hover:text-[color:var(--td-text)]',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-[color:var(--td-border)] bg-[color:var(--td-surface-muted)] p-4 text-xs text-[color:var(--td-text-muted)]">
        <p className="font-semibold text-[color:var(--td-text)]">Suggerimento</p>
        <p className="mt-1 leading-relaxed">
          Usa <span className="pill">Ctrl / Cmd + Shift + N</span> per aprire il Quick Add da qualsiasi schermata.
        </p>
      </div>
    </aside>
  );
}

