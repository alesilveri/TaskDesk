# Audit repository

## Summary
Repository pulito con un'app attiva in `apps/taskdesk` (Electron + Vite + React + Tailwind + SQLite) e un set minimo di riferimenti storici in `docs/dev/legacy/references/`. Gli artifact pesanti sono stati rimossi e ora sono ignorati da `.gitignore`.

## Inventory (high level)
- Root
  - `AGENTS.md`, `CHANGELOG.md`, `README.md`, `PRIVACY.md`, `LICENSE`, `.gitignore`
- `apps/taskdesk/`
  - App principale (Electron + Vite + React + Tailwind + SQLite)
- `assets/`
  - Banner, icone e screenshot placeholder
- `docs/`
  - Audit, decisions, identity e prompt in `docs/prompts/`
- `docs/dev/legacy/references/`
  - Legacy source e materiali di riferimento
- `.github/`
  - Issue/PR templates e workflow release

## Potentially useful items
- `docs/dev/legacy/references/legacy-taskdesk-v3.1.1/` (vecchia base Electron/SQLite da consultare come riferimento).
- `docs/dev/legacy/references/legacy-architecture.md` (architettura storica utile per decisioni tecniche).
- `docs/dev/legacy/references/clients-sample.csv` (formato CSV clienti da usare per import/mapping).
- `docs/dev/legacy/references/RegistroAttivita.zip` (app compilata collega; solo benchmark UX).

## Noise / artifacts
- Nessun artifact pesante tracciato (node_modules, dist, release e build sono ignorati).

## Notes
- `apps/taskdesk` e' l'unica base attiva per l'MVP.
