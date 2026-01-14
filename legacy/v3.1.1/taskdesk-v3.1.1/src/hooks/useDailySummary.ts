import { useCallback, useEffect, useState } from 'react';
import type { DailySnapshot, ActivitiesChangeEvent } from '../types';

interface DailySummaryResult {
  snapshot: DailySnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDailySummary(date: string): DailySummaryResult {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!bridge?.summaries) {
      setSnapshot(null);
      setError('Bridge non disponibile');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await bridge.summaries.daily(date);
      setSnapshot(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossibile calcolare il riepilogo giornaliero');
    } finally {
      setLoading(false);
    }
  }, [bridge, date]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, date]);

  useEffect(() => {
    if (!bridge?.activities) {
      return () => {};
    }
    const unsubscribe = bridge.activities.onChanged((event: ActivitiesChangeEvent) => {
      if (event?.type) {
        fetchSummary();
      }
    });
    return () => unsubscribe?.();
  }, [bridge, fetchSummary]);

  return {
    snapshot,
    loading,
    error,
    refresh: fetchSummary,
  };
}
