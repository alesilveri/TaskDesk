# Tech Debt

## P0 (stabilita / sicurezza)
- Dipendenza nativa `better-sqlite3`: build locale fragile (richiede toolchain) e fallisce fuori Node LTS.
- IPC senza validazione runtime (payload liberi) -> rischio dati incoerenti o crash.
- Nessun guard su `schema_version` > app: mancano warning/abort per compatibilita DB.
- Error handling IPC minimo: errori DB e file system non sono gestiti con retry/log.

## P1 (manutenibilita)
- `App.tsx` monolitico: logica e UI miste, difficile testare o riusare.
- Nessuna suite di test (unit/integration/e2e) oltre smoke manuale.
- Tema `system` non reagisce a cambi OS, manca listener a `nativeTheme`.
- Locale/timezone non centralizzati (date-fns default en, timezone non fissata).

## P2 (scalabilita / performance)
- Liste non virtualizzate fuori dalla vista Giorno (es. ricerca fino a 500 righe).
- Export crea workbook completo in memoria senza streaming; su mesi grandi puo' rallentare.
- Nessuna strategia di vacuum/maintenance DB o verifica integrita.
