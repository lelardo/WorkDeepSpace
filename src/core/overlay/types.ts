// src/core/overlay/types.ts
import type { ComponentType, RefObject } from 'react';
import type { DbApi }     from '../db/types';
import type { User }      from '../auth/types';
import type { Migration } from '../db/types';

export type OverlayCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface OverlayProps {
  db:    DbApi;
  user:  User;
  dark?: boolean;
  fabX:  number;
  fabY:  number;
  /** Posición del panel relativa al shell (calculada por OverlayLayer) */
  panelX: number;
  panelY: number;
  /** @deprecated — ya no se usa, el panel va al lado */
  panelClearance: number;
  didDragRef:   RefObject<boolean>;
  onDragStart:  (e: React.MouseEvent) => void;
  onPanelOpen:  () => void;
  onPanelClose: () => void;
}

export interface OverlayWidget {
  id:            string;
  component:     ComponentType<OverlayProps>;
  defaultCorner: OverlayCorner;
  /** Ancho del panel en px — el OverlayLayer lo usa para posicionarlo */
  panelWidth?:   number;
  /** Alto del panel en px */
  panelHeight?:  number;
  migrations?:   Migration[];
}

export const FAB_SIZE   = 60;
export const FAB_MARGIN = 20;
export const STACK_GAP  = FAB_SIZE + 10;