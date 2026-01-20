# Insights collega — RegistroAttivita

## Features utili da portare
- **Rubrica clienti da CSV**: elenco clienti importabile/gestibile tramite file CSV (utile per onboarding rapido).
- **Categorie cliente implicite**: nel CSV compaiono annotazioni tipo “CANONE OK / NO CANONE”, che suggeriscono una **categoria o flag cliente** (es. canone attivo) utile per filtri/report.
- **Codici cliente**: molti nomi includono codici tra parentesi (es. `(00152-00001)`), utile prevedere un campo “codice cliente” o “codice gestionale”.

## Cosa NON portare
- **Eseguibile compilato** (nessun sorgente riusabile).
- **Storage a cartelle/flat-file** (meglio SQLite local-first con migrazioni).
- **Qualsiasi UI o layout** (non disponibile e comunque da ridisegnare).
