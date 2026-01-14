import { useMemo, useState } from 'react';
import { Download, UploadCloud, UserPlus } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import type { Client, ClientFilters, ClientInput } from '../../types';

function createEmptyClient(): ClientInput & { id?: string } {
  return {
    id: undefined,
    name: '',
    category: '',
    vatNumber: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    active: true,
  };
}

export function ClientsPage() {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState<ClientInput & { id?: string }>(createEmptyClient());
  const [feedback, setFeedback] = useState<string | null>(null);

  const filters = useMemo<ClientFilters>(() => {
    const filter: ClientFilters = {};
    if (search.trim()) {
      filter.search = search.trim();
    }
    if (activeFilter !== 'all') {
      filter.active = activeFilter === 'active';
    } else {
      filter.active = 'all';
    }
    return filter;
  }, [search, activeFilter]);

  const { clients, loading, refresh } = useClients(filters);

  const selectClient = (client: Client) => {
    setForm({
      id: client.id,
      name: client.name,
      category: client.category,
      vatNumber: client.vatNumber,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      notes: client.notes,
      active: client.active,
    });
  };

  const resetForm = () => {
    setForm(createEmptyClient());
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFeedback('Il nome del cliente è obbligatorio');
      return;
    }
    try {
      if (!bridge?.clients) {
        setFeedback('Bridge non disponibile');
        return;
      }
      const payload: ClientInput = {
        name: form.name.trim(),
        category: form.category?.trim() || undefined,
        vatNumber: form.vatNumber?.trim() || undefined,
        contactName: form.contactName?.trim() || undefined,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        active: form.active,
      };
      if (form.id) {
        await bridge.clients.update(form.id, payload);
        setFeedback('Cliente aggiornato con successo');
      } else {
        await bridge.clients.create(payload);
        setFeedback('Cliente creato con successo');
      }
      resetForm();
      await refresh();
    } catch (err) {
      console.error(err);
      setFeedback('Si è verificato un errore durante il salvataggio');
    }
  };

  const handleImport = async () => {
    try {
      if (!bridge?.clients) {
        setFeedback('Bridge non disponibile');
        return;
      }
      const result = await bridge.clients.importCSV();
      if (result) {
        setFeedback(`Importati ${result.imported} clienti (${result.skipped} già presenti)`);
        await refresh();
      }
    } catch (err) {
      console.error(err);
      setFeedback('Errore durante l\'import CSV');
    }
  };

  const handleExport = async () => {
    try {
      if (!bridge?.clients) {
        setFeedback('Bridge non disponibile');
        return;
      }
      const filePath = await bridge.clients.exportCSV();
      if (filePath) {
        setFeedback(`Esportazione completata: ${filePath}`);
      }
    } catch (err) {
      console.error(err);
      setFeedback('Errore durante l\'export CSV');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--td-text-muted)]">Gestione clienti</p>
            <h1 className="text-xl font-semibold text-[color:var(--td-text)]">Rubrica operativa</h1>
          </div>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            <UserPlus className="h-4 w-4" />
            Nuovo cliente
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            className="input flex-1"
            placeholder="Cerca per nome o referente…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex items-center gap-2 rounded-xl bg-[color:var(--td-surface-muted)] p-1">
            {[
              { value: 'all', label: 'Tutti' },
              { value: 'active', label: 'Attivi' },
              { value: 'inactive', label: 'Non attivi' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveFilter(option.value as typeof activeFilter)}
                className={`rounded-lg px-3 py-1 text-sm transition ${
                  activeFilter === option.value
                    ? 'bg-[color:var(--td-accent)] text-white'
                    : 'text-[color:var(--td-text-muted)] hover:text-[color:var(--td-text)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[color:var(--td-border)]">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Referente</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-[color:var(--td-text-muted)]">
                    Caricamento clienti…
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-[color:var(--td-text-muted)]">
                    Nessun cliente trovato con questi filtri.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => selectClient(client)}
                  >
                    <td className="text-sm font-medium text-[color:var(--td-text)]">{client.name}</td>
                    <td className="text-xs text-[color:var(--td-text-muted)]">{client.category || '—'}</td>
                    <td className="text-xs text-[color:var(--td-text-muted)]">{client.contactName || '—'}</td>
                    <td>
                      <span className={`tag ${client.active ? 'tag-billable' : 'tag-nonbillable'}`}>
                        {client.active ? 'Attivo' : 'Sospeso'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={handleImport}>
            <UploadCloud className="h-4 w-4" />
            Importa CSV
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Esporta CSV
          </button>
          {feedback ? <span className="text-xs text-[color:var(--td-text-muted)]">{feedback}</span> : null}
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold text-[color:var(--td-text)]">
          {form.id ? 'Modifica cliente' : 'Nuovo cliente'}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Nome
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ragione sociale"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Categoria
            <input
              className="input"
              value={form.category ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Canone, progetto, prospect…"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Referente
            <input
              className="input"
              value={form.contactName ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
              placeholder="Nome referente"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Email
            <input
              className="input"
              value={form.contactEmail ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
              placeholder="email@cliente.it"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Telefono
            <input
              className="input"
              value={form.contactPhone ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
              placeholder="+39..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Partita IVA
            <input
              className="input"
              value={form.vatNumber ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, vatNumber: event.target.value }))}
              placeholder="IT..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
            Stato
            <select
              className="input"
              value={form.active ? 'active' : 'inactive'}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))}
            >
              <option value="active">Attivo</option>
              <option value="inactive">Non attivo</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--td-text-muted)]">
          Note
          <textarea
            className="input"
            rows={4}
            value={form.notes ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Informazioni aggiuntive, condizioni commerciali, ecc."
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Salva
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
