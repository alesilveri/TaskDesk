# TaskDesk — Prompt operativo per Codex (v1) — Autonomy: FULL

RUOLO
Sviluppatore unico in questa repo. Agisci in autonomia totale. Documenta in CHANGELOG/README/PLAN.

VERSIONING & RELEASE
- Baseline v1.0.0; SemVer; Conventional Commits.
- GitHub Actions su tag v*: build Win (NSIS Setup + Portable) e macOS (DMG) + upload asset alla Release.
- Auto-update: “check & prompt” (no silenzioso). Fallback “Scarica ultima Release”.
- Se manca origin e c’è gh: crea repo privata TaskDesk, set origin, push + tag.

RESUME LOGIC
- Usa PLAN.md/STATE.json/diff git per riprendere run interrotti. Stampa RESUME REPORT.

LEGACY ANALYSIS (se legacy/v3.1.1)
- Recupera componenti utili del vecchio 3.1.1; riscrivi deprecazioni (Vite CJS, Tailwind content, electron-is-dev).
- Migrazione dati opzionale con backup; scrivi LEGACY_REPORT.md.

OBIETTIVO
- Giorno/Settimana/Mese + Clienti + Verbali + Export + Backup (come AGENT.md).
- Smart Module: Planner/Filler/Grouping/Suggeritore/Advisor/Checklist/Budget.
- Desktop UX: Tray/Notifiche/Jump List/Dock/Hotkey/deep-links/Onboarding/Impostazioni.
- Performance: virtualizzazione liste, IPC async, worker per export/backup, startup rapido. ESLint/Prettier/TS strict.

DATI & MIGRAZIONI
- Tabella `meta` con `schema_version`; migrazioni transactional con backup pre-migrazione e rollback su errore.
- PRAGMA: foreign_keys=ON, journal_mode=WAL, synchronous=NORMAL, temp_store=MEMORY.
- Indici su date, client_id, ref_verbale, (date, client_id).
- Manutenzione: wal_checkpoint settimanale, VACUUM mensile (se idle).

TEMPO & CALENDARIO
- Timezone Europe/Rome; settimane ISO-8601; rispetto DST.
- Somma minuti per attività; guardrail durate (<60m salvo eccezioni).

SICUREZZA
- nodeIntegration:false, contextIsolation:true, sandbox:true; preload contextBridge; IPC whitelist.
- CSP; blocca navigation esterne; sanitizza export; normalizza path.
- Single-instance lock; deep-links; crash handler locale; Error Center con log rotanti redatti.

TEST & QUALITÀ
- `npm run smoke` (apri, crea attività, export XLSX, chiudi) + QA checklist 10 passi.
- CHANGELOG chiaro; LICENSE/PRIVACY minime.

IMPLEMENTA ORA
1) AUDIT & PLAN (+ STATE.json) e LEGACY_REPORT se serve.
2) Feature core (Giorno/Settimana/Mese, Clienti, Verbali, Export, Backup/Migrazioni).
3) Smart Module completo.
4) Desktop UX completo.
5) AI opzionale (UI+keychain+fallback).
6) Fix tecnici (Vite/Tailwind/electron-is-dev/icone/dev script/TS).
7) Build + auto-update predisposto; GH Actions su tag.
8) Git & Release (commit, push main, tag, Release con asset).
9) Docs (README/CHANGELOG/PLAN/LEGACY_REPORT; guida “Riprendere un run interrotto”).

OUTPUT FINALE (stampa)
- File toccati (path + motivo).
- Esito `npm run dev` e `npm run build`.
- Test rapido: Giorno (tot/gap), Settimana (tot/giorno/cliente/gap), Mese (tot/giorni/cliente/progress), Import CSV→autocomplete, Verbali (ricerca+DOCX/PDF), Export (XLSX/CSV + Daily Task ICON), Tray/Notifiche/Jump List/Dock/Hotkey, Smart Module, AI OFF→ON (se configurata).
- Git: branch, ultimo commit, push ok.
- Release: tag creato e pubblicato (link).
