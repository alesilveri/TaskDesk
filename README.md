![TaskDesk banner](assets/banner.svg)

# TaskDesk

![Build](https://github.com/alesilveri/TaskDesk/actions/workflows/release.yml/badge.svg)

TaskDesk e' un registro attivita smart, local-first, pensato per ricostruire le attivita da inserire nel gestore commesse. Non e' un tool di fatturazione: il focus e' la chiarezza e la credibilita' di Giorno/Settimana/Mese.

![Screenshot placeholder](assets/screenshot-placeholder.png)

## Highlights (MVP)
- CRUD attivita con quick-add, duplicazione e cronologia minimale.
- Vista Giorno con totali, gap e smart filler.
- Vista Settimana e Mese con breakdown per giorno e cliente.
- Ricerca con filtri (cliente, testo, date, non inserite).
- Rubrica clienti con autocomplete, recenti e import CSV.
- SQLite local-first con WAL, migrazioni transazionali e backup pre-migrazione.
- Export XLSX + CSV (Daily Task ICON + riepilogo cliente).
- Backup con rotazione e ripristino guidato.
- Tray, menu app, hotkey globale e promemoria gap.
- Temi light/dark/system.

## Struttura repo
- `apps/taskdesk` app Electron
- `docs` documentazione
- `assets` branding e media
- `references` materiali legacy utili

## Dev setup
```bash
cd apps/taskdesk
npm install
npm run dev
```

## Build
```bash
cd apps/taskdesk
npm run build
```

## Smoke test
```bash
cd apps/taskdesk
npm run smoke
```

## Release
1. Aggiorna `CHANGELOG.md` e `package.json` (versione).
2. Crea tag `vX.Y.Z` e push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions genera gli asset in release.

## Note privacy
Tutti i dati sono locali. Il database vive in `app.getPath('userData')` (Windows: `%APPDATA%\\TaskDesk`, macOS: `~/Library/Application Support/TaskDesk`).
