# Repository Guidelines

## Project Structure & Module Organization
TaskDesk ships as a Vite + Electron desktop bundle. Front-end code lives in `src/`, with route wiring in `src/App.tsx` and theming helpers under `src/app/`. Feature-specific logic sits in `src/features/`, shared UI primitives in `src/components/`, hooks in `src/hooks/`, and cross-cutting utilities in `src/lib/`. Tailwind entry points are kept in `src/styles/`, while shared types land in `src/types/`. The Electron main process and desktop services (backups, exports, notifications) reside under `electron/`; persistence is handled by the bundled SQLite database helper in `electron/db`. Production bundles land in `dist/` (Electron) and `dist-web/` (Vite); launcher assets live in `build/`.

## Build, Test, and Development Commands
Run `npm install` once per environment to hydrate dependencies, including `better-sqlite3`. `npm run dev` starts Vite and the Electron shell together, enabling live reload against the renderer and quick-add window. Use `npm run build` to produce distributable artifacts (`dist/` plus installers via `electron-builder`). `npm run typecheck` runs the TypeScript compiler in `--noEmit` mode to catch contract regressions before packaging.

## Coding Style & Naming Conventions
Author components and pages in TypeScript (`.tsx`) with 2-space indentation and trailing commas, matching the existing formatting. React components and context providers use PascalCase filenames (`TaskList.tsx`), hooks start with `use` (`useActivities.ts`), and utility modules in `src/lib` prefer camelCase exports. Tailwind utility classes should remain co-located in component templates; shared design tokens belong in `styles/index.css`. Keep IPC channel ids and SQL table names kebab-cased to stay aligned with the existing Electron services.

## Testing Guidelines
The repository currently ships without automated tests; contribute Vitest or Playwright coverage when touching critical flows such as monthly exports or backups. Mirror the directory under test (e.g., `src/features/activities/__tests__/activitySummary.test.ts`) and favor scenario-based names (`should_create_monthly_summary_from_tracked_entries`). Always run `npm run dev` to do a manual regression pass across dashboard, quick-add, and export dialogs before requesting review.

## Commit & Pull Request Guidelines
Use Conventional Commit headers (`feat: quick-add presets`, `fix: backups respect custom path`) to ease changelog generation. Each commit should scope to a single concern and include schema migrations or IPC changes alongside renderer updates. Pull requests must describe the user impact, list manual verification steps, and attach screenshots/gifs for UI changes; link Trello or issue IDs in the description footer (`Refs: TD-123`). Highlight any database migrations or settings keys that need QA attention.

## Data & Configuration Notes
The SQLite db file is created on first launch inside the Electron userData directory; avoid committing generated `.db` files. Store environment-specific secrets via OS keychain APIs instead of hardcoding them. When adding exports, reuse helpers in `electron/services/*` and prefer storing temporary files in the user's Documents folder to maintain platform parity.
