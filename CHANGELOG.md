# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.0.1] - 2026-01-14
### Added
- Node LTS enforcement (.nvmrc/.node-version + preinstall check).
- Preset attivita with reuse and management.
- Inline edit for daily activities and rapid search filter.
- Copy-to-clipboard format for Gestore + copy sheet in XLSX export.
- Month view top activities and anomaly detection.
- App icons for Windows/macOS builds.

### Changed
- Export now ships XLSX only (Daily Task ICON + report mese).
- Menu bar reshaped to File/Edit/View/Tools/Help with update check.
- Release workflow updated to Node 22 LTS (build green).
- Smoke script now reads the root smoke test guide.

## [1.0.0] - 2026-01-14
### Added
- Repo cleanup and reference segregation (references/ + docs/prompts).
- Inspiration research doc and updated technical decisions.
- Activity status, change history, and settings table with auto-start.
- Search view with filters and smart gap suggestions.
- Client CSV import with mapping and recent clients.
- Monthly CSV export and updated XLSX labels.
- Theme system (light/dark/system) with CSS variables and gradients.
- App menu, tray show/hide, and gap reminder notifications.
- Smoke test guide and script.
- Auto-update wiring for packaged builds (electron-updater).

### Changed
- Updated AGENTS and repo hygiene defaults.
- Tailwind colors now driven by CSS variables for theming.
- Export sheet for non-inserite uses correct filter.

## [0.1.0] - 2026-01-14
### Added
- Initial TaskDesk scaffold (Electron + Vite + React + TS + Tailwind).
- SQLite local-first schema with activities and clients.
- Day/Week/Month base views and quick-add modal.
