/**
 * useModuleData Hook — Gestor de estado reactivo para queries SQL
 * 
 * Uso:
 *   const { data, loading, reload } = useModuleData<TaskType>(
 *     db,
 *     'SELECT * FROM kanban_tasks WHERE status = $1 ORDER BY position',
 *     ['todo']
 *   );
 */

import { useState, useEffect, useCallback } from 'react';
import type { DbApi, Row } from '../db/types';

export function useModuleData<T extends Row>(
  db: DbApi | null,
  query: string,
  params: any[] = [],
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the reload function properly
  const reload = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await db.all<T>(query, params);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [db, query, JSON.stringify(params)]);

  useEffect(() => {
    reload();
  }, [reload, ...deps]);

  return { data, loading, error, reload };
}
