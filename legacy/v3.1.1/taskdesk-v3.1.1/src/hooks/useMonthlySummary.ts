import { useCallback, useEffect, useState } from 'react';
import type { MonthlySummary } from '../types';

interface MonthlySummaryResult {
  summary: MonthlySummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMonthlySummary(month: string): MonthlySummaryResult {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!bridge?.summaries) {
      setSummary(null);
      setError('Bridge non disponibile');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await bridge.summaries.monthly(month);
      setSummary(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossibile calcolare il riepilogo mensile');
    } finally {
      setLoading(false);
    }
  }, [bridge, month]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, month]);

  useEffect(() => {
    if (!bridge?.activities) {
      return () => {};
    }
    const unsubscribe = bridge.activities.onChanged(() => {
      fetchSummary();
    });
    return () => unsubscribe?.();
  }, [bridge, fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
  };
}
