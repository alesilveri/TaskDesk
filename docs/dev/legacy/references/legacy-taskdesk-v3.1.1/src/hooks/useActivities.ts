import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, ActivityFilters, ActivitiesChangeEvent } from '../types';

interface UseActivitiesResult {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivities(filters: ActivityFilters = {}): UseActivitiesResult {
  const bridge = typeof window !== 'undefined' ? window.api : undefined;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  const fetchActivities = useCallback(async () => {
    if (!bridge?.activities) {
      setActivities([]);
      setError('Bridge non disponibile');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await bridge.activities.list(filters);
      setActivities(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossibile caricare le attività');
    } finally {
      setLoading(false);
    }
  }, [bridge, filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, filterKey]);

  useEffect(() => {
    if (!bridge?.activities) {
      return () => {};
    }
    const unsubscribe = bridge.activities.onChanged((event: ActivitiesChangeEvent) => {
      if (event?.type === 'refresh') {
        fetchActivities();
        return;
      }
      fetchActivities();
    });
    return () => unsubscribe?.();
  }, [bridge, fetchActivities, filterKey]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
}
