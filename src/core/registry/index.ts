// src/core/registry/index.ts
import type { AppModule } from '../types/module';
import { initDb } from '../db/migrations';
import { AUTH_MIGRATIONS } from '../auth/migrations';
import { initOverlays } from '../overlay/overlayRegistry';

import { DemoModule }   from '../../modules/demo';
import { KanbanModule } from '../../modules/kanban';
import { ChatModule }   from '../../modules/chat';
import { BacklogModule }   from '../../modules/backlog';
import { SprintModule }   from '../../modules/sprintboard';
import { RoadmapModule }   from '../../modules/roadmap';


const MODULES: AppModule[] = [
  DemoModule,
  KanbanModule,
  ChatModule,
  BacklogModule,
  SprintModule,
  RoadmapModule,

];

// Orden: auth → módulos → overlays
(async () => {
  await initDb([
    { moduleId: 'auth', migrations: AUTH_MIGRATIONS },
    ...MODULES.map(m => ({ moduleId: m.id, migrations: m.migrations ?? [] })),
  ]);
  await initOverlays();
  console.info('[registry] listo');
})();

export const Registry = {
  all: () => MODULES,
  get: (id: string) => MODULES.find(m => m.id === id),
};