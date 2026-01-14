![TaskDesk banner](assets/banner.svg)

# TaskDesk

![Build](https://github.com/ORG/REPO/actions/workflows/release.yml/badge.svg)

Il tuo registro attivita smart, al posto di Excel. TaskDesk e una desktop app local-first per registrare attivita, tempi e riepiloghi Giorno/Settimana/Mese in modo chiaro e credibile.

![Screenshot placeholder](assets/screenshot-placeholder.png)

## Highlights (MVP)
- CRUD attivita con quick-add e duplicazione.
- Vista Giorno con totali e gap rispetto target.
- Vista Settimana e Mese con totali, gap e breakdown cliente/giorno.
- Rubrica clienti con autocomplete.
- SQLite local-first con WAL e migrazioni.
- Tray + hotkey base (Ctrl/Cmd+Shift+N).
- Export XLSX (Attivita / Riepilogo / Da inserire / Daily Task ICON).
- Backup con rotazione e ripristino guidato.
- Smart gap e smart grouping per chiusura mese.

## Roadmap breve
- Command palette e search globale.

## Struttura repo
- `apps/taskdesk` progetto applicazione
- `docs` documentazione
- `assets` branding e media

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

## Note
TaskDesk e una app personale: nessun dato esce dal computer. Il database vive in `AppData/TaskDesk` (Windows) o `~/Library/Application Support/TaskDesk` (macOS).
