# Audit repository

## Summary
Repository pulito con un'app attiva in `apps/taskdesk` (Electron + Vite + React + Tailwind + SQLite). Gli artifact pesanti sono stati rimossi e ora sono ignorati da `.gitignore`.

## Inventory (high level)
- Root
  - `AGENTS.md`, `CHANGELOG.md`, `README.md`, `PRIVACY.md`, `LICENSE`, `.gitignore`
- `apps/taskdesk/`
  - App principale (Electron + Vite + React + Tailwind + SQLite)
- `assets/`
  - Banner, icone e screenshot placeholder
- `docs/`
  - Audit, decisions, identity e prompt in `docs/prompts/`
  - Legacy source e materiali di riferimento
- `.github/`
  - Issue/PR templates e workflow release

## Potentially useful items

## Noise / artifacts
- Nessun artifact pesante tracciato (node_modules, dist, release e build sono ignorati).

## Notes
- `apps/taskdesk` e' l'unica base attiva per l'MVP.
