# Audit repository

## Summary
The workspace is mostly legacy/backups plus a compiled colleague app. There is no current active TaskDesk app at root yet. The main usable technical reference is `legacy/v3.1.1/taskdesk-v3.1.1` (Electron + Vite + React + SQLite). There are large build artifacts and `node_modules` that should not ship in the new repo.

## Inventory (high level)
- Root files
  - `.gitignore`
  - `AGENTS.md`
  - `PROMPT_TASKDESK_FULL.md`
- `legacy/`
  - `v3.1.1/taskdesk-v3.1.1/` (Electron app source + config; artifacts moved out)
- `archive/`
  - `TaskDesk_bck_old/` (backup copy of legacy app + compiled colleague app)
  - `legacy-v3.1.1-artifacts/` (`node_modules`, `dist`, `dist-web`, `build`)
- `references/`
  - `RegistroAttivita.zip` (colleague app, compiled)

## Potentially useful items
- `legacy/v3.1.1/taskdesk-v3.1.1/` source code (reference for Electron + SQLite patterns).
- `TaskDesk_bck_old/docs/architecture.md` (clear architecture outline; can be distilled into decisions/notes).
- `TaskDesk_bck_old/RegistroAttivita/CLIENTI/clienti.csv` (sample client list format; shows category hints like “CANONE OK / NO CANONE”).

## Noise / artifacts
- `archive/legacy-v3.1.1-artifacts/` (moved here to keep repo clean).
- `archive/TaskDesk_bck_old/` (duplicate legacy app + `node_modules`, `dist`, `dist-web`).
- `references/RegistroAttivita.zip` and `archive/TaskDesk_bck_old/RegistroAttivita/` (compiled binaries only).

## Notes
- No current active `apps/taskdesk` scaffold exists yet.
- Colleague app appears as a compiled .NET executable with CSV-based client data; no UI/source to reuse.
