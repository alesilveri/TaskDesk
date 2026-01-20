# Smoke Test (TaskDesk)

Obiettivo: verificare che l'MVP funzioni end-to-end.

## Avvio
1. `npm run dev` in `apps/taskdesk`.
2. Verifica che la finestra Electron si apra e non mostri errori.

## Inserimento attivita
1. Click "+ Nuova attivita".
2. Compila data, cliente, titolo, minuti, stato.
3. Salva e verifica la voce in lista.

## Modifica
1. Doppio click su una voce.
2. Cambia minuti e stato, salva.
3. Verifica che la cronologia mostri la modifica.

## Modifica inline
1. Usa "Modifica inline" su una voce.
2. Cambia titolo, cliente o minuti.
3. Salva e verifica l'aggiornamento.

## Ricerca
1. Vai su "Ricerca".
2. Filtra per cliente e range date.
3. Verifica che la lista risultati sia coerente.

## Export
1. Vai su "Mese".
2. Esporta XLSX.
3. Usa "Copia formato Gestore".
4. Verifica il file e il testo negli appunti.

## Preset
1. Apri una nuova attivita, salva come preset.
2. Applica il preset dalla vista Giorno o Impostazioni.
3. Verifica che i campi si precompilino correttamente.

## Backup
1. Vai su "Impostazioni".
2. Crea un backup.
3. Ripristina il backup creato e verifica che i dati tornino.

## Chiusura
1. Chiudi la finestra.
2. Verifica che l'app si chiuda senza errori.
