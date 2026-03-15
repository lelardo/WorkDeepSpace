// src/core/db/useDb.ts
//
// Hook para acceder a la BD desde dentro de un componente de módulo.
// La instancia `db` en ModuleProps ya está lista — este hook es para
// cuando necesites hacer queries reactivas (con re-render al cambiar datos).
//
// Uso básico:
//   const { db, loading } = useDb();
//   const tasks = db?.all('SELECT * FROM kanban_tasks') ?? [];

import { useState, useEffect } from 'react';
import { getDb } from './db';
import type { DbApi } from './types';

export function useDb() {
  const [db, setDb]       = useState<DbApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]  = useState<Error | null>(null);

  useEffect(() => {
    getDb()
      .then(instance => { setDb(instance); setLoading(false); })
      .catch(err     => { setError(err);   setLoading(false); });
  }, []);

  return { db, loading, error };
}