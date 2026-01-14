# TaskDesk - Product Agent (v1)

## Visione prodotto
TaskDesk e' un desktop tracker personale per ricostruire le attivita da inserire nel gestore commesse/attivita. Non e' uno strumento di fatturazione. Deve offrire viste Giorno/Settimana/Mese chiare, gap visibili e funzioni "smart" credibili per chiudere il mese senza inventare.

## Policy qualita
- UX premium: layout pulito, gerarchia chiara, contrasto corretto, hover/selected evidenti, accessibilita' WCAG base.
- Dati affidabili: SQLite con migrazioni transazionali, backup prima delle migrazioni, niente perdita di dati silenziosa.
- Prestazioni: liste virtualizzate quando crescono, query indicizzate, feedback immediato.
- Stabilita dev: avvio dev predictibile, chiusura pulita, nessun crash all'exit.
- Chiarezza: nomi coerenti, time tracking in minuti, timezone Europe/Rome.

## Security Electron (obbligatorio)
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` dove possibile.
- Preload con API minime e whitelist IPC (no `ipcRenderer` generico esposto).
- `webSecurity: true`, niente `allowRunningInsecureContent`.
- Content Security Policy in `index.html`.
- Nessun caricamento di contenuti remoti non necessari.

## Stile UI
- Light/Dark/System con palette dedicate e contrasto verificabile.
- Tipografia moderna e riconoscibile (no default system stack anonima).
- Componenti con stati chiari: hover, active, focus, selected, disabled.
- Layout denso ma leggibile: griglie, card, tabelle con righe alternate/hover.
- Feedback visivo per gap, target e progressi (badge, progress bar, callout).
