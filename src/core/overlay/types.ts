// src/core/overlay/types.ts
import type { ComponentType, RefObject, ReactNode } from 'react';
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
  panelX: number;
  panelY: number;
  panelClearance: number;
  didDragRef:   RefObject<boolean>;
  onDragStart:  (e: React.MouseEvent) => void;
  onPanelOpen:  () => void;
  onPanelClose: () => void;
}

export interface OverlayWidget {
  id:            string;
  /** Nombre visible en el sidebar */
  name:          string;
  /** Icono visible en el sidebar y el FAB */
  icon:          ReactNode;
  author?:       string;
  component:     ComponentType<OverlayProps>;
  defaultCorner: OverlayCorner;
  panelWidth?:   number;
  panelHeight?:  number;
  migrations?:   Migration[];
}

export const FAB_SIZE   = 60;
export const FAB_MARGIN = 20;
export const STACK_GAP  = FAB_SIZE + 10;