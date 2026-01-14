# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

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
