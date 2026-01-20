# Technical Decisions

Date: 2026-01-20

## Decision
Aggiornare toolchain dev per chiudere vulnerabilita note (Electron >=35.7.5, Vite 7, Vitest 4).

## Context
`npm audit` segnala advisory su Electron (<35.7.5) ed esbuild (usato da Vite/Vitest). Serve restare su LTS ma con patch di sicurezza.

## Rationale
- Upgrade mirato di Electron per correggere la vulnerabilita ASAR integrity bypass.
- Upgrade di Vite/Vitest per recepire le patch di esbuild.
- Manteniamo Node LTS 20/22 e `engine-strict` per evitare rebuild nativi su Node 24.

## Evidence (links)
- Electron security advisory: https://github.com/advisories/GHSA-vmqv-hx8q-j7mg
- esbuild advisory: https://github.com/advisories/GHSA-67mh-4wv8-2f99

---

## Decision
Smoke test automatico: DB temporaneo + export XLSX reale.

## Context
Lo smoke manuale non garantiva che l'export funzionasse davvero.

## Rationale
- Verifica end-to-end dell'export senza avviare l'app completa.
- Riduce regressioni su ExcelJS/export.

---

## Decision
Backup retention 7 giornalieri / 4 settimanali / 6 mensili + safety backup prima del restore.

## Context
Backup semplice a rotazione fissa (10) non garantiva copertura temporale.

## Rationale
- Copertura breve + lunga senza crescite infinite.
- Restore sicuro: si salva prima lo stato corrente.

---

## Decision
CI minima con Node LTS e setup-node + dependabot per npm/github-actions.

## Context
Pipeline assente su PR/push; rischio regressioni.

## Evidence (links)
- GitHub setup-node: https://github.com/marketplace/actions/setup-node-js-environment
- Dependabot config: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

---

## Decision
Repo idonea a essere pubblica (scan segreti ok).

## Context
Richiesta di rendere la repo “vetrina” ma senza dati sensibili.

## Rationale
- Scansione rapida su token/chiavi comuni non ha trovato segreti.
- Nessun dato cliente reale nei file tracciati.

Date: 2026-01-14

## Decision
Use **Electron + Vite + React + Tailwind + SQLite** for TaskDesk v1.

## Context
TaskDesk richiede integrazioni OS (tray, global hotkey, notifiche), accesso locale affidabile (SQLite/WAL) e un flusso di build/distribuzione stabile su Windows/macOS. La priorita dell'MVP e' la consegna veloce e prevedibile.

## Options
- A) Electron + Vite + React + Tailwind + SQLite
- B) Tauri v2 + Vite + React + SQLite

## Evidence (links)
- Electron overview (Chromium + Node.js): https://www.electronjs.org/
- Electron Tray API: https://www.electronjs.org/docs/latest/api/tray
- Electron globalShortcut API: https://www.electronjs.org/docs/latest/api/global-shortcut
- Electron Notification API: https://www.electronjs.org/docs/latest/api/notification
- Electron Distribution overview: https://www.electronjs.org/pt/docs/latest/tutorial/distribution-overview
- Electron Security best practices: https://www.electronjs.org/docs/latest/tutorial/security
- Electron BrowserWindow contextIsolation: https://www.electronjs.org/docs/latest/api/browser-window
- Tauri v2 system tray: https://v2.tauri.app/learn/system-tray/
- Tauri global shortcut plugin: https://v2.tauri.app/plugin/global-shortcut/
- Tauri notification plugin: https://v2.tauri.app/plugin/notification/
- Tauri core permissions/capabilities: https://v2.tauri.app/es/security/capabilities/
- Tauri architecture: https://v2.tauri.app/concept/architecture/
- Tauri process model (OS WebView): https://v2.tauri.app/concept/process-model/
- Tauri v2 stable release: https://tauri.app/release/tauri/v2.0.0/

## Decision Matrix
Criteria | Electron | Tauri v2
--- | --- | ---
Tray / hotkey / notify | API integrate e mature (Tray, globalShortcut, Notification). | Richiede plugin dedicati (system tray, global shortcut, notification) e capability permissions.
Security model | Linee guida e hardening disponibili; richiede discipline di sandboxing e context isolation. | Capabilities esplicite per API/plug-in, surface area controllata.
Runtime footprint | Usa Chromium + Node.js. | Usa WebView di sistema, runtime piu' leggero.
Packaging & distribuzione | Tooling consolidato e docs mature per release multi-OS. | Bundling supportato, ma richiede toolchain Rust e plugin setup.
Dev velocity (MVP) | Stack web completo, meno requisiti esterni. | Richiede Rust + plugin/capabilities; setup piu' articolato.

## Rationale
- TaskDesk richiede integrazioni OS immediate e affidabili (tray, hotkey, notifiche). Electron offre API integrate e documentazione molto stabile.
- L'MVP privilegia velocita di implementazione e prevedibilita del packaging: Electron riduce attrito di toolchain.
- Tauri v2 e' stabile e piu' leggero, ma richiede configurazione di capabilities e plugin, oltre alla toolchain Rust.

## Revisit
Dopo l'MVP, rivalutare Tauri se footprint e consumo memoria diventano prioritari o se le capability soddisfano pienamente le esigenze di integrazione.

---

## Decision
Update strategy basata su **GitHub Releases** con build multi-OS via GitHub Actions. Auto-update predisposto (feed GitHub) e check manuale dall'app.

## Context
Serve un flusso prevedibile per distribuire EXE/Portable e DMG senza infrastruttura dedicata. L'MVP deve poter rilasciare rapidamente e mantenere tracciabilita'.

## Rationale
- GitHub Releases e' semplice da gestire e si integra con `electron-builder`.
- Possiamo esporre un check aggiornamenti manuale e predisporre l'auto-update senza introdurre servizi esterni.
- Le release restano versionate e tracciabili in `CHANGELOG.md`.
- `electron-updater` e' cablato per check aggiornamenti in build packaged.
- Per repository privati l'auto-update richiede token GitHub lato client; per questo manteniamo il check manuale e gli asset in release.

## Evidence (links)
- Electron-builder auto update: https://www.electron.build/auto-update.html
- electron-builder GitHub publish (private): https://www.electron.build/configuration/publish.html

---

## Decision
Toolchain bloccata su **Node.js LTS 20/22** per dev e CI.

## Context
`better-sqlite3` e' un modulo nativo con prebuild pensate per versioni LTS; usare versioni Current (es. Node 24) richiede compilazione locale con toolchain C++ e aumenta i fallimenti di installazione su Windows.
Nota: anche se Node 24 e' LTS, congeliamo su 20/22 finche' non verifichiamo piena copertura di prebuild e compatibilita' con Electron.

## Rationale
- Usare solo LTS riduce i fallimenti di installazione e stabilizza la pipeline CI.
- La policy LTS garantisce supporto e patch di sicurezza a lungo termine.

## Evidence (links)
- Node.js release status (LTS/Current): https://nodejs.org/en/download/releases/
- better-sqlite3 README (prebuilt binaries for LTS): https://github.com/WiseLibs/better-sqlite3

---

## Decision
UI kit **custom** basato su Tailwind + class-variance-authority, senza librerie UI pesanti.

## Context
Serve una UI premium, coerente e altamente personalizzabile (temi light/dark/system, stati evidenti, layout denso ma leggibile).

## Rationale
- Tailwind + CVA consente di definire componenti consistenti con controllo totale del design.
- Evita vincoli di librerie generiche, mantenendo performance e payload snelli.
