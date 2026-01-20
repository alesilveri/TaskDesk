# TaskDesk Next Architecture

## Vision
TaskDesk evolves into a cross-platform (Windows/macOS) desktop control center for daily and monthly operations. Electron orchestrates windows, menus, tray, and system integration; React renders a modern, theme-aware UI; SQLite persists data; Tailwind drives styling. The application eliminates Excel spreadsheets by offering rich dashboards, client management, automated summaries, and exports (Excel/PDF).

## Solution Overview
- **Process separation**
  - `electron/main.js`: bootstraps database, windows, tray, shortcuts, and IPC.
  - `electron/db.js`: shared Better-SQLite3 connection, schema migrations, query helpers.
  - `electron/services/`: export, backup, CSV utilities, notification helpers.
  - `electron/preload.js`: exposes a strongly typed bridge (`window.api`) with grouped namespaces (activities, clients, summaries, exports, system).
- **Renderer (`src/`)**
  - React + Vite + TypeScript entry (`src/main.tsx`) with React Router.
  - UI organized under `src/features/` (Dashboard, Month, Clients, QuickAdd, Settings).
  - Shared hooks (`src/hooks/`), context-driven session/theme state, and reusable primitives (`src/components/`).
  - Tailwind utility classes backed by custom design tokens (light/dark) declared in `src/styles/theme.css`.

## Data Model
Tables live in `%APPDATA%/TaskDesk/taskdesk.sqlite` (or `~/Library/Application Support/TaskDesk/` on macOS).

### clients
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID v4 |
| `name` | TEXT UNIQUE | Required |
| `category` | TEXT | Optional grouping (e.g., canone/no) |
| `vat_number` | TEXT | Optional |
| `contact_name` | TEXT | Optional |
| `contact_email` | TEXT | Optional |
| `contact_phone` | TEXT | Optional |
| `notes` | TEXT | |
| `active` | INTEGER | 1 default |
| `created_at` / `updated_at` | TEXT ISO | Auto managed |

### activities
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID v4 |
| `client_id` | TEXT FK clients(id) | Nullable |
| `title` | TEXT | Required |
| `description` | TEXT | |
| `date` | TEXT | ISO YYYY-MM-DD |
| `start_time` / `end_time` | TEXT | HH:mm |
| `duration_minutes` | INTEGER | Auto calculated if possible |
| `status` | TEXT | e.g. `planned`, `in_progress`, `done` |
| `type` | TEXT | e.g. `onsite`, `remoto`, `meeting`, `ticket` |
| `billable` | INTEGER | Boolean |
| `tags` | TEXT | CSV string |
| `notes` | TEXT | Extended notes |
| `created_at` / `updated_at` | TEXT ISO | Auto managed |

### activity_events
Optional audit trail to support future analytics (kept lightweight):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK | Autoincrement |
| `activity_id` | TEXT | FK |
| `event` | TEXT | `created`, `updated`, `status_change`, etc. |
| `payload` | TEXT | JSON blob |
| `created_at` | TEXT | Timestamp |

## IPC Surface (`window.api`)
```ts
interface TaskDeskAPI {
  activities: {
    list(params?: ActivityQuery): Promise<Activity[]>;
    get(id: string): Promise<Activity | null>;
    create(input: ActivityInput): Promise<Activity>;
    update(id: string, input: ActivityInput): Promise<Activity>;
    remove(id: string): Promise<void>;
  };
  clients: {
    list(params?: ClientQuery): Promise<Client[]>;
    create(input: ClientInput): Promise<Client>;
    update(id: string, input: ClientInput): Promise<Client>;
    remove(id: string): Promise<void>;
    importCSV(path: string): Promise<{ imported: number; skipped: number }>;
    exportCSV(path: string): Promise<void>;
    autocomplete(term: string): Promise<Client[]>;
  };
  summaries: {
    daily(date: string): Promise<DailySnapshot>;
    monthly(month: string): Promise<MonthlySummary>;
  };
  exports: {
    excel(month: string, targetPath: string): Promise<void>;
    pdf(month: string, targetPath: string): Promise<void>;
  };
  backup: {
    create(targetFolder?: string): Promise<string>;
    restore(sourcePath: string): Promise<void>;
  };
  system: {
    theme(): Promise<'light' | 'dark'>;
    onThemeChange(callback: (theme: 'light' | 'dark') => void): void;
    notify(options: NotificationOptions): void;
  };
  window: {
    openQuickAdd(preset?: Partial<ActivityInput>): Promise<void>;
    closeQuickAdd(): Promise<void>;
  };
}
```

## Application Flow
1. **Startup**
   - Main process ensures schema via migrations.
   - Main window loads `/dashboard`.
   - Renderer queries `summaries.monthly` for the current month and caches clients.
2. **Activity lifecycle**
   - Creating/updating activities recalculates `duration_minutes`, persists, records event, emits `activities:changed` broadcast for live views.
   - Desktop notifications triggered for activities scheduled within the next hour, leveraging Electron `Notification`.
3. **Monthly Summary**
   - Aggregates total hours, billable vs non-billable, unique clients served, active days count, and top tags.
   - Renderer displays cards + charts (Recharts or custom SVG) on `/month`.
4. **Clients module**
   - Table with search, status filters, quick toggles.
   - CSV import merges by name; export writes canonical headers.
5. **Tray & Shortcuts**
   - Tray menu: “Apri TaskDesk”, “Nuova attività…”, “Esporta mese corrente (Excel)”, “Backup rapido”, separator, “Esci”.
   - Global shortcut `CtrlOrCmd+Shift+N` (system-level) toggles quick-add window; renderer also supports `Ctrl+N` when focused.
6. **Exports & Backup**
   - Excel uses `exceljs` templates.
   - PDF uses `pdfkit` (added dependency) for month summary.
   - Backup copies SQLite DB + JSON metadata to user-chosen directory.

## UI Structure
- **App chrome**: sidebar navigation (Dashboard, Giorno, Mese, Clienti, Report, Impostazioni) with responsive collapse, top bar hosts month picker and quick actions.
- **Dashboard (Today)**: timeline of today’s activities, quick stats, shortcuts to add time, quick add modal, outstanding tasks.
- **Monthly**: aggregated metrics, calendar heatmap (via minimal SVG), list of days with totals.
- **Clients**: searchable table, inline editing panel, import/export controls, filters (“Attivi”, “Non attivi”, “Canone”, etc.).
- **Quick Add window**: compact form (title, client autocomplete, duration/time, billable toggle, notes) with keyboard-first interactions.

## Styling & Themes
- Tailwind config extends colors `td-*` generated from CSS variables living in `:root[data-theme="dark|light"]`.
- Renderer listens to `system.theme` and allows user override persisted in SQLite `settings` table (light/dark/system).
- Typography: Inter / system stack; monospace for durations.
- Components include focus styles, accessible contrast, and skeleton states.

## Build & Distribution
- `npm run dev`: Vite + Electron concurrently (unchanged).
- `npm run build`: Vite build + electron-builder (win/mac targets).
- Additional npm scripts planned:
  - `lint` (ESLint) — optional for future.
  - `format` (Prettier) — optional.
- Cross-platform packaging uses `electron-builder.yml` to define icons, DMG/win installers (existing file reused).

## Future Hooks
- Settings table (key/value) reserved for features like user preferences, backup schedules, integration toggles.
- `activity_events` enables timeline view or synchronization with third-party services if needed.

