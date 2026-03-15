// src/core/overlay/overlayRegistry.ts
//
// Registro de widgets de overlay — separado del Registry de módulos.
// Para agregar un overlay:
//   1. Crea tu widget en src/overlays/mi-widget/
//   2. Importa y agrégalo a OVERLAYS

import type { OverlayWidget } from './types';
import { initDb } from '../db/migrations';

// ── Importa tus overlays aquí ─────────────────────────
import { ChatOverlay } from '../../overlay_modules/chat';
import { NotesOverlay } from '../../overlay_modules/notes';
// import { NotificationsOverlay } from '../../overlays/notifications';

const OVERLAYS: OverlayWidget[] = [
  ChatOverlay,
  NotesOverlay,
  // NotificationsOverlay,
];

// Corre migraciones de overlays (se llama desde el registry principal)
export async function initOverlays() {
  await initDb(
    OVERLAYS.map(o => ({ moduleId: `overlay:${o.id}`, migrations: o.migrations ?? [] }))
  );
}

export const OverlayRegistry = {
  all: () => OVERLAYS,
  get: (id: string) => OVERLAYS.find(o => o.id === id),
};