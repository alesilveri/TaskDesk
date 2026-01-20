# TaskDesk — Full Audit & Gap Analysis

## Executive summary
- Stato: MVP ricco di feature core (Giorno/Settimana/Mese, preset, export, backup, tray, reminder).
- Blocchi attuali: installazione/build falliscono su Node v24.13.0; better-sqlite3 non compila senza toolchain ClangCL; di conseguenza dev/build non parte.
- Gap principali: validazioni dati minime, UX keyboard e focus states assenti, locale/lingua non impostati (date-fns default en), timezone Europe/Rome non garantita, IPC openExternal senza whitelist.
- Rischio medio: App.tsx monolitico, nessun test automatico, error handling ridotto.

## Repo snapshot
- Struttura:
  - `/apps/taskdesk`
    - `/src` React UI (App unico)
    - `/electron` main/preload/db/backup/export/csv
    - `/build` icone
    - `/scripts` dev/smoke/check-node
  - `/docs` documentazione
  - `/assets` branding e screenshot placeholder

- Dichiarato in AGENTS/README/CHANGELOG:
  - TaskDesk = tracker personale local-first, non fatturazione; focus su viste Giorno/Settimana/Mese e gap credibili.
  - Highlights: CRUD attivita, smart filler, preset, ricerca, clienti con import CSV, SQLite WAL con migrazioni + backup, export XLSX + copia Gestore, tray/menu/hotkey, temi.
  - 1.0.1: Node LTS enforcement, preset, inline edit, export migliorato, mese con top/anomalie, icone app.

## Build & dev sanity (run locale 2026-01-20)
Ambiente: Node v24.13.0, npm 11.7.0 (fuori range `>=20 <23`).

Comandi eseguiti:
- `npm ci` -> FAIL
  - EBADENGINE: richiesta Node 20/22, trovato 24.13.0.
  - `better-sqlite3` build error: manca toolchain ClangCL (MSB8020).
  - Warnings deprecati (rimraf v2/v3, glob v7/v8, electron-rebuild, ecc.).
- `npm run dev` -> FAIL
  - `concurrently` non trovato (node_modules incompleto).
- `npm run build` -> FAIL
  - `vite` non trovato (node_modules incompleto).
- `npm run smoke` -> OK
  - Stampa `docs/dev/SMOKE_TEST.md` (non esegue test automatici).

Impatto: in questo ambiente non e' possibile validare runtime UI o build.

## Feature alignment vs obiettivo
- Forte: viste Giorno/Settimana/Mese con gap e smart grouping, export mensile, preset, backup con rotazione, tray/menu/notification.
- Debole: validazioni e regole credibili per chiusura mese (minuti/limiti), UX per keyboard e controlli veloci, locale/lingua/date in italiano, gestione verbali e clienti non completa.

## UI/UX (sintesi)
- Buona base visiva: palette, card, densita ragionevole, CTA visibili.
- Gap: focus states mancanti, scarsa navigazione da tastiera, assenza di heatmap/visualizzazione calendario mese, font non bundlati (dipende da sistema), theme `system` non reagisce al cambio OS.

## Desktop integration
- Tray: presente, azioni utili (mostra/nascondi, quick add, export).
- Notifiche: presenti per gap e export.
- Menu bar: completo (File/Edit/View/Tools/Help), include update check e backup dir.
- Icone: presenti in `build/` e referenziate in config.
- Gaps: nessun controllo su deep-link o openExternal; setWindowOpenHandler/will-navigate assenti.

## Data model & DB
- SQLite con WAL, migrazioni transazionali, backup pre-migrazione.
- Tabelle: `activities`, `clients`, `activity_history`, `activity_templates`, `app_settings`, `schema_version`.
- Indici base su date/client/status.
- Rischi:
  - Nessuna constraint/validazione su minuti (puo' essere > 24h o negativo).
  - Nessuna compatibilita esplicita se DB ha `schema_version` > app.
  - Date in ISO locale ma timezone non fissata (richiesto Europe/Rome).

## Security & IPC (Electron)
- OK: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, CSP presente.
- Gap:
  - Nessun blocco navigazioni esterne (`will-navigate`, `setWindowOpenHandler`).
  - `system:openExternal` accetta qualsiasi URL senza whitelist.
  - CSP usa `style-src 'unsafe-inline'` (da mitigare se possibile).
  - Error handling IPC minimale: errori DB possono propagare e crashare.

## Release / GitHub workflow
- Workflow `release.yml` su tag `v*`, build su Windows/macOS, upload asset.
- `electron-updater` configurato per GitHub: funziona in repo pubblica; se privata richiede token e update server.
- README: molto dev-oriented (setup/build); manca sezione “User quick start” e screenshot reale.

## Rischi principali (ordine)
1. Build bloccata su ambienti non-LTS (Node 24) + toolchain native (`better-sqlite3`) -> impedisce validazione e distribuzione.
2. Validazioni dati insufficienti (minuti, status, verbali) -> rischio di report non credibili.
3. UX keyboard/focus assente -> inefficienza per uso daily.
4. Sicurezza IPC: openExternal senza whitelist + navigazione non bloccata.
5. Locale/Timezone non garantiti (Europe/Rome) -> mismatch con requisiti.

## Decisione consigliata (prossimo run, 3-5 task)
1. Stabilizzare dev/build: usare Node 22 LTS, documentare toolchain Windows e sistemare `better-sqlite3` prebuild.
2. Hardening sicurezza Electron: blocco navigazioni esterne + whitelist per openExternal.
3. Validazioni dati + regole credibili (min/max minuti, campi obbligatori, verbali).
4. UX accessibility: focus/hover/selected coerenti + scorciatoie base.
5. Locale/Timezone: date-fns con locale IT e baseline Europe/Rome.
