# Component Guide — Modular Workspace

There are two types of components you can create:

| Type | Where it lives | Example |
|------|-----------|---------|
| **Module** | Dashboard panel, side-by-side with others | Kanban, Demo |
| **Overlay** | Floating button over the entire UI | Chat, Notes |

---

## TYPE 1 — Dashboard Module

### Structure
```
src/modules/my-module/
└── index.tsx
```

### Steps

**1.** Copy `src/modules/_template/` → `src/modules/my-module/`

**2.** Edit the descriptor at the bottom of the file:
```ts
export const MyModule: AppModule = {
  id:          'my-module',     // unique across the app — no spaces
  name:        'My Module',
  description: 'What it does',
  icon:        '🧩',            // emoji or ReactNode

  component: MyModuleComponent,

  layout: {
    defaultCols:   6,    // initial columns (1–12). 6 = half, 12 = full row
    defaultRows:   4,    // height weight when distributing rows
    isMinimizable: true,
    canExpandFull: true,
  },

  migrations: [
    {
      version: 1,        // NEVER edit existing versions, only add new ones
      sql: `
        CREATE TABLE IF NOT EXISTS my_table (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          value     TEXT    NOT NULL,
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );
      `,
    },
  ],
};
```

**3.** Write the component:
```tsx
const MyModuleComponent = ({ db, dark }: ModuleProps) => {
  const [items, setItems] = useState<MyType[]>([]);

  useEffect(() => {
    setItems(db.all<MyType>('SELECT * FROM my_table ORDER BY id DESC'));
  }, [db]);

  return (
    <div style={ms.container}>
      {/* use ms.* for styles consistent with the theme */}
    </div>
  );
};
```

**4.** Register in `src/core/registry/index.ts`:
```ts
import { MyModule } from '../../modules/my-module';

const MODULES: AppModule[] = [
  DemoModule,
  KanbanModule,
  MyModule,   // ← here
];
```

---

## TYPE 2 — Floating Overlay

Overlays are floating buttons (FAB) that the user can drag and anchor to any corner of the screen. When clicked, they open a panel that appears **next to** the button, vertically aligned with it.

The `OverlayLayer` handles all the positioning, drag, snap, and stacking logic. The component only receives ready-to-use coordinates.

### Structure
```
src/overlays/my-overlay/
└── index.tsx
```

### Descriptor
```ts
export const MyOverlay: OverlayWidget = {
  id:            'my-overlay',
  component:     MyOverlayComponent,
  defaultCorner: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  panelWidth:    340,             // ← IMPORTANT: OverlayLayer uses this for positioning the panel
  panelHeight:   480,             // ← IMPORTANT: same
  migrations:    [],
};
```

### Component
```tsx
function MyOverlayComponent({
  db, user,
  panelX, panelY,       // panel coordinates relative to shell — DON'T calculate this yourself
  didDragRef,           // shared ref: true if mouseup was drag, not click
  onDragStart,          // pass to onMouseDown of FAB
  onPanelOpen,          // call when panel opens
  onPanelClose,         // call when panel closes
}: OverlayProps) {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    if (didDragRef.current) return;  // ignore if it was a drag
    const next = !open;
    setOpen(next);
    next ? onPanelOpen() : onPanelClose();
  };

  return (
    <>
      {/* Panel — position:absolute, coords given by OverlayLayer */}
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}  // prevents panel from activating drag
          style={{
            position: 'absolute',
            left: `${panelX}px`,
            top:  `${panelY}px`,
            zIndex: 300,
            width: `${PANEL_W}px`,
            height: `${PANEL_H}px`,
            // ... rest of styles
          }}
        >
          {/* content */}
        </div>
      )}

      {/* FAB — onMouseDown activates drag in OverlayLayer */}
      <button
        onMouseDown={onDragStart}   // ← activates drag
        onClick={toggleOpen}        // ← opens/closes panel (only if not a drag)
        style={{
          position: 'absolute', left: 0, top: 0,
          width: `${FAB_SIZE}px`, height: `${FAB_SIZE}px`,
          borderRadius: '22px',
          cursor: 'grab',
          pointerEvents: 'auto',
          // ...
        }}
      >
        {open ? <X size={22}/> : <MyIcon size={22}/>}
      </button>
    </>
  );
}
```

### How positioning works

The `OverlayLayer` automatically calculates:

- **FAB position** — assigned corner (`defaultCorner`) with automatic stacking if there are multiple in the same corner
- **Panel position** — next to the FAB, vertically aligned:
  - FAB on the left → panel to its right
  - FAB on the right → panel to its left
  - FAB on top → panel aligned to FAB's top
  - FAB on bottom → panel aligned to FAB's bottom
- **Drag & snap** — when released, FAB snaps to the nearest corner with spring animation
- **Stacking** — if there are multiple overlays in the same corner, they stack on top of each other without overlapping
- **Z-index** — the overlay with open panel automatically moves to the top

**The component doesn't need to calculate any of this** — just use `panelX`/`panelY` as they arrive.

### Register in `src/core/overlay/overlayRegistry.ts`:
```ts
import { MyOverlay } from '../../overlays/my-overlay';

const OVERLAYS: OverlayWidget[] = [
  ChatOverlay,
  NotesOverlay,
  MyOverlay,   // ← here
];
```

---

## Available Props

### ModuleProps (dashboard modules)
```ts
interface ModuleProps {
  db:      DbApi;    // database ready to use
  dark?:   boolean;
  config?: Record<string, unknown>;
}
// Note: for the user use useSession() inside the component
```

### OverlayProps (floating overlays)
```ts
interface OverlayProps {
  db:             DbApi;
  user:           User;           // always available in overlays
  dark?:          boolean;
  panelX:         number;         // panel position (relative to shell)
  panelY:         number;         // calculated by OverlayLayer — use it directly
  didDragRef:     RefObject<boolean>; // read .current in onClick to distinguish drag from click
  onDragStart:    (e: React.MouseEvent) => void;
  onPanelOpen:    () => void;
  onPanelClose:   () => void;
}
```

---

## Database API (`db`)

```ts
// Write — returns lastInsertRowid
db.run('INSERT INTO my_table (value) VALUES (?)', ['hello'])

// Read multiple
db.all<MyType>('SELECT * FROM my_table ORDER BY id DESC')

// Read single row
db.get<MyType>('SELECT * FROM my_table WHERE id = ?', [1])
```

**Important with SQLite WASM:** always use single quotes in SQL for string literals:
```ts
// ✅ correct
db.run("UPDATE table SET edited_at=datetime('now') WHERE id=?", [id])

// ❌ incorrect — double quotes inside template string
db.run(`UPDATE table SET edited_at=datetime("now") WHERE id=?`, [id])
```

Data is automatically saved to `localStorage` after each `db.run()` and restored on reload.

---

## Session User (`useSession`)

Available from any module component:
```ts
import { useSession } from '../../core/auth/authStore';

const session = useSession(); // Session | null

if (session) {
  session.user.id            // number
  session.user.username      // string
  session.user.display_name  // string
}
```

In overlays the user arrives directly as a `user: User` prop (always available because overlays only mount with an active session).

---

## Style Tokens (`ms`)

```ts
import { ms } from '../../core/styles/tokens';
```

| Token | Use |
|-------|-----|
| `ms.container` | Main wrapper (flex col, padding, scroll, height 100%) |
| `ms.card` | Card with border and elevated background |
| `ms.label` | Section label (uppercase, small) |
| `ms.title` | Title |
| `ms.body` | Normal text |
| `ms.muted` | Secondary text |
| `ms.divider` | Horizontal separator line |
| `ms.input` | Text input |
| `ms.select` | Dropdown |
| `ms.textarea` | Text area |
| `ms.btn.primary` | Blue button |
| `ms.btn.secondary` | Button with border |
| `ms.btn.ghost` | Transparent icon button |
| `ms.btn.danger` | Red button |
| `ms.badge('info'\|'success'\|'warning'\|'danger'\|'default')` | Badge/pill |
| `ms.list` | Scrollable list container |
| `ms.empty` | Centered empty state |
| `ms.row` | Flex row with gap |

All use CSS variables (`var(--text)`, `var(--bg-card)`, etc.) — they automatically respond to dark/light mode without any additional prop.

---

## Summary — Files to touch

| What to create | New file | File to edit |
|-----------|--------------|-----------------|
| Dashboard module | `src/modules/my-module/index.tsx` | `src/core/registry/index.ts` |
| Floating overlay | `src/overlays/my-overlay/index.tsx` | `src/core/overlay/overlayRegistry.ts` |
