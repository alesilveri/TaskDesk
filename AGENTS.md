# TaskDesk — Product Agent (v1)

Scopo
Desktop app che sostituisce Excel per tracciare attività con riepiloghi chiari (Giorno/Settimana/Mese) e strumenti “smart” per chiudere il mese in modo credibile.

Dati attività
Data, Cliente (rubrica + autocomplete + recenti), Titolo, Descrizione, Riferimento Verbale, Risorsa ICON, Tempo (min). Flag: Caricato nel Gestore, Verbale fatto.

Viste & funzioni
Giorno (quick-add, inline, tot/gap), Settimana (ISO-8601: tot/settimana, per giorno/cliente, gap), Mese (tot/giorni/cliente, progress/gap), Clienti (import CSV/mapping), Verbali (ricerca, stato, genera DOCX/PDF), Export (XLSX/CSV + “Daily Task ICON”), Backup WAL (auto + manuale).

Smart
Smart Planner (what-if, distribuzione credibile), Smart Filler (10–25m coerenti), Smart Grouping (Cliente+Rif./Titolo), Suggeritore tempi (15/20/30/45), Advisor credibilità, Checklist chiusura, (opz) Budget cliente.

UX/desktop
Temi Light/Dark/System con contrasti corretti, Tray + Notifiche, Jump List/Taskbar (Win) con badge, Dock badge (mac), Global Hotkey Quick-Add, deep-links, Command Palette, Onboarding, Impostazioni (auto-avvio, portabile, hotkey, AI).

AI (opzionale, OFF)
Bridge provider (API/locale stub); key in OS Keychain; parser offline sempre presente; nessuna web-UI Plus.

Tecnico
Electron + Vite + React + Tailwind + SQLite; dev chiusura pulita; build EXE/Portable + DMG; auto-update predisposto su Releases; schema versionato, migrazioni transazionali, rollback.
