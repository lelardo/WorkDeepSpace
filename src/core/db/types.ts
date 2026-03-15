// src/core/db/types.ts

/** Una migración es SQL que crea/altera tablas */
export interface Migration {
  /** Número único creciente — incrementar para nuevas migraciones del módulo */
  version: number;
  sql: string;
}

/** Fila genérica de un SELECT */
export type Row = Record<string, unknown>;

/** API pública que recibe cada módulo para operar su BD */
export interface DbApi {
  /** Ejecuta INSERT / UPDATE / DELETE. Retorna lastInsertRowid */
  run(sql: string, params?: unknown[]): number;
  /** SELECT que devuelve múltiples filas */
  all<T extends Row>(sql: string, params?: unknown[]): T[];
  /** SELECT que devuelve una sola fila o undefined */
  get<T extends Row>(sql: string, params?: unknown[]): T | undefined;
}