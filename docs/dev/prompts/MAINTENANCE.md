# TaskDesk - Maintenance Prompt

Scopo: manutenzione ordinaria (dipendenze, sicurezza, performance, QA).

Checklist:
- Aggiorna dipendenze con attenzione a breaking changes.
- Verifica security posture Electron (CSP, preload, IPC whitelist).
- Esegui smoke test documentato in `docs/dev/SMOKE_TEST.md`.
- Aggiorna `CHANGELOG.md` con esito e note.
- Non introdurre nuove feature senza decisione esplicita in `docs/DECISIONS.md`.
