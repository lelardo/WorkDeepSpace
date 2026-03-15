// src/core/types/module.ts
import type { ComponentType, ReactNode } from 'react';
import type { Migration, DbApi } from '../db/types';

export interface ModuleLayout {
  /** Columnas iniciales (1-12) — determina en qué fila cae el módulo al abrirse */
  defaultCols:   number;
  defaultRows:   number;
  isMinimizable: boolean;
  canExpandFull: boolean;
}

export interface ModuleProps {
  dark?:   boolean;
  db:      DbApi;
  config?: Record<string, unknown>;
}

export interface AppModule {
  id:          string;
  name:        string;
  description: string;
  icon:        ReactNode;
  component:   ComponentType<ModuleProps>;
  layout:      ModuleLayout;
  migrations?: Migration[];
}