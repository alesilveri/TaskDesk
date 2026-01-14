import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Client, ClientFilters, ClientsChangeEvent } from '../types';

interface UseClientsResult {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClients(filters: ClientFilters = {}): UseClientsResult {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  const fetchClients = useCallback(async () => {
    if (!bridge?.clients) {
      setClients([]);
      setError('Bridge non disponibile');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await bridge.clients.list(filters);
      setClients(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossibile caricare i clienti');
    } finally {
      setLoading(false);
    }
  }, [bridge, filters]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients, filterKey]);

  useEffect(() => {
    if (!bridge?.clients) {
      return () => {};
    }
    const unsubscribe = bridge.clients.onChanged((event: ClientsChangeEvent) => {
      if (event?.type) {
        fetchClients();
      }
    });
    return () => unsubscribe?.();
  }, [bridge, fetchClients, filterKey]);

  return {
    clients,
    loading,
    error,
    refresh: fetchClients,
  };
}
