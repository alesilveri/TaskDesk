![TaskDesk banner](assets/banner.svg)

# TaskDesk
Registro attivita smart, local-first, per sostituire Excel nella chiusura mese.

![CI](https://github.com/alesilveri/TaskDesk/actions/workflows/ci.yml/badge.svg) ![Release](https://img.shields.io/github/v/release/alesilveri/TaskDesk)

![Screenshot](assets/screenshot.png)

[Download](https://github.com/alesilveri/TaskDesk/releases) · [Quick start](docs/DEV_SETUP.md)

## Perche esiste
TaskDesk serve per ricostruire attivita di supporto/ops da riportare nel Gestore, senza inventare nulla.
Mostra Day/Week/Month con gap reali, top clienti e anomalie, cosi chiudi il mese con dati credibili.

## Feature top
- Day/Week/Month con gap e target configurabili.
- Export XLSX “Daily Task ICON” + copia Gestore (raggruppata).
- Smart suggestions (micro-attivita solo se manca tempo).
- Backup/restore con rotazione + safety backup.
- Clienti con import CSV e recenti.
- Preset attivita riutilizzabili.
- Temi light/dark/system, UI densa ma pulita.
- Tray + hotkey globale quick add.

## Download
- Windows: installer NSIS + Portable in Releases.
- macOS: DMG in Releases.

## Dove salva i dati
Database locale in `app.getPath('userData')`. Nessun cloud.

## Export
- **Daily Task ICON** (XLSX)
- **Formato Gestore** (copia negli appunti, settimanale e mensile)

## FAQ
**Serve Node?** Solo per sviluppo. Per usare l'app basta la Release.  
**Node supportati in dev?** LTS 20/22. Node 24 e' bloccato.  
**Backup?** Rotazione automatica + restore guidato.

## Roadmap breve
- Screenshot reali dalla app (autocapture).
- Notifiche smart configurabili.
- Deep links (taskdesk://today).

## Dev
Guida rapida in `docs/DEV_SETUP.md`.

## Licenza
MIT
