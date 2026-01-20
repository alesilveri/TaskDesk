# Next Priorities (2 settimane)

## P0 (settimana 1, blocchi)
- Allineare ambiente a Node 22 LTS e documentare prerequisiti Windows (VS Build Tools + toolchain).
- Hardening Electron: blocco navigazioni esterne, whitelist per `openExternal`, gestione errori IPC.
- Validazioni dati minime (min/max minuti, title obbligatorio, warning durata anomala) con feedback UI.

## P1 (settimana 1-2, valore prodotto)
- Vista Mese con calendario/heatmap e highlight giorni mancanti + gap.
- Shortcut tastiera per viste e quick add + focus ring consistente.
- Filtri rapidi per status/cliente/tag e chip visibili in lista.

## P2 (settimana 2, robustezza)
- Split di `App.tsx` in view/componenti e introduzione test base.
- Locale IT + timezone Europe/Rome centralizzati.
- Migliorie export (CSV, range, template) e backup (verifica integrita).
