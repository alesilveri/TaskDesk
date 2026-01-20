# Dev setup (TaskDesk)

## Requisiti
- Node.js LTS 22 (o 20). Node 24 non supportato.
- Windows: Visual Studio Build Tools + C++ workload (necessario se manca prebuild di better-sqlite3).

## Install
```bash
cd apps/taskdesk
npm ci
```

## Dev
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Smoke test
```bash
npm run smoke
```

Nota: se `better-sqlite3` compila da sorgente, assicurarsi che la toolchain C++ sia installata.
