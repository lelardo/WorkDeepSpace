# Component Guide — Modular Workspace

There are two types of components you can create:

| Type | Where it lives | Example |
|------|-----------|---------|
| **Module** | Dashboard panel, side-by-side with others | Kanban, Demo |
| **Overlay** | Floating button over the entire UI | Chat, Notes |

---

## Database System

**WorkDeepSpace** supports two persistence modes:

| Mode | Usage | Storage | Connection |
|------|-------|---------|------------|
| **Local (Development)** | `npm run dev:local` | PGlite (WASM) → IndexedDB | In-process |
| **Remote (Production)** | `npm run dev:remote` | PostgreSQL (Neon, AWS RDS, etc.) | API Backend |

### Configuration — `.env.local`

```env
# Operation mode
VITE_DB_MODE=local        # or 'remote'

# If VITE_DB_MODE=remote, configure the connection:
VITE_DB_HOST=your-postgres-host
VITE_DB_PORT=5432
VITE_DB_NAME=your_database_name
VITE_DB_USER=your_username
VITE_DB_PASSWORD=your_password
VITE_DB_SSL=true           # or false if connecting locally

# API server port (remote only)
API_PORT=3001
```

### Mode Auto-detection

The framework automatically detects the mode from `VITE_DB_MODE`:
- **local**: PGlite in the browser, data persisted in IndexedDB
- **remote**: HTTP requests to `http://localhost:3001/api/db/*` (dev) or same host (prod)

### Development scripts

```bash
npm run dev:local       # Vite + PGlite only (fast development)
npm run dev:remote      # Node.js server + Vite (dev with real PostgreSQL)
npm run build           # Production (compiled, requires Node backend in prod)
```

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
  icon:        <MyIcon size={20} />, // icon from lucide-react

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
          id        SERIAL PRIMARY KEY,
          value     TEXT    NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    },
  ],
};
```

**⚠️ Important — PostgreSQL syntax:**
- `SERIAL PRIMARY KEY` (not `AUTOINCREMENT`)
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (not `datetime('now')`)
- Parameters: `$1, $2, $3...` (not `?`)

**3.** Write the component using `useModuleData`:
```tsx
import { useModuleData } from '../../core/hooks/useModuleData';

const MyModuleComponent = ({ db, dark }: ModuleProps) => {
  const { data: items, loading, error, reload } = useModuleData<MyType>(
    db,
    'SELECT * FROM my_table ORDER BY id DESC'
  );

  const addItem = async () => {
    if (!db) return;
    await db.run(
      'INSERT INTO my_table (value) VALUES ($1)',
      ['new value']
    );
    await reload();  // ← important: wait for reload to complete
  };

  return (
    <div style={ms.container}>
      {loading ? (
        <div style={ms.empty}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={ms.empty}>No data</div>
      ) : (
        items.map(item => /* render */)
      )}
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
src/overlay_modules/my-overlay/
└── index.tsx
```

### Descriptor
```ts
export const MyOverlay: OverlayWidget = {
  id:            'my-overlay',
  component:     MyOverlayComponent,
  defaultCorner: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  panelWidth:    340,
  panelHeight:   480,
  migrations:    [],
};
```

### Component with persistence
```tsx
import { useModuleData } from '../../core/hooks/useModuleData';

function MyOverlayComponent({
  db, user,
  panelX, panelY,
  didDragRef,
  onDragStart,
  onPanelOpen,
  onPanelClose,
}: OverlayProps) {
  const [open, setOpen] = useState(false);
  const { data: items, reload } = useModuleData<MyType>(
    db,
    'SELECT * FROM my_table WHERE user_id = $1 ORDER BY id DESC',
    [user.id]
  );

  const toggleOpen = () => {
    if (didDragRef.current) return;
    const next = !open;
    setOpen(next);
    next ? onPanelOpen() : onPanelClose();
  };

  const addItem = async () => {
    if (!db) return;
    await db.run(
      'INSERT INTO my_table (user_id, value) VALUES ($1, $2)',
      [user.id, 'new']
    );
    await reload();  // ← always wait
  };

  return (
    <>
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${panelX}px`,
            top:  `${panelY}px`,
            zIndex: 300,
            width: '340px',
            height: '480px',
            // ... styles
          }}
        >
          {/* content — use items */}
        </div>
      )}

      <button
        onMouseDown={onDragStart}
        onClick={toggleOpen}
        style={{
          position: 'absolute', left: 0, top: 0,
          width: '44px', height: '44px',
          borderRadius: '22px',
          cursor: 'grab',
          pointerEvents: 'auto',
        }}
      >
        {open ? <X size={22}/> : <MyIcon size={22}/>}
      </button>
    </>
  );
}
```

### Register in `src/core/overlay/overlayRegistry.ts`:
```ts
import { MyOverlay } from '../../overlay_modules/my-overlay';

const OVERLAYS: OverlayWidget[] = [
  ChatOverlay,
  NotesOverlay,
  MyOverlay,   // ← here
];
```

---

## Database API (`db`)

All operations are **async** — always use `await`:

```ts
// Write — INSERT, UPDATE, DELETE, CREATE TABLE
await db.run('INSERT INTO my_table (value) VALUES ($1)', ['hello'])

// Read multiple — returns array
const items = await db.all<MyType>('SELECT * FROM my_table ORDER BY id DESC')

// Read single row — returns object or undefined
const item = await db.get<MyType>('SELECT * FROM my_table WHERE id = $1', [1])
```

**Parameters:** Always use `$1, $2, $3...` (PostgreSQL style):
```ts
// ✅ correct
await db.run("UPDATE table SET value=$1, edited_at=CURRENT_TIMESTAMP WHERE id=$2", ['new', 5])

// ❌ incorrect (SQLite style)
await db.run("UPDATE table SET value=?, edited_at=datetime('now') WHERE id=?", ['new', 5])
```

---

## Reactive Hook — `useModuleData`

Executes a query and automatically re-renders:

```ts
import { useModuleData } from '../../core/hooks/useModuleData';

const { data, loading, error, reload } = useModuleData<MyType>(
  db,
  'SELECT * FROM my_table WHERE status = $1',
  ['active'],  // parameters
  []           // optional dependencies
);

// Inside a handler (create, edit, delete):
const handleAdd = async () => {
  await db.run('INSERT INTO my_table VALUES ...', [...]);
  await reload();  // ← updates data automatically
};
```

**Properties:**
- `data: MyType[]` — query results
- `loading: boolean` — true while executing
- `error: Error | null` — error if any
- `reload: () => Promise<void>` — re-execute the query

---

## Persistence — How it works

### Local Mode (PGlite)

1. **Storage**: Browser's IndexedDB
2. **Lifecycle**:
   - App starts → PGlite creates BD in memory
   - Tables are created via migrations
   - Each operation syncs to IndexedDB automatically
   - On reload → restored from IndexedDB
3. **Data persists between sessions**: Yes (unless you clear IndexedDB)

```bash
npm run dev:local
# Data lives in: IndexedDB → idb://modular-workspace
```

### Remote Mode (PostgreSQL + API)

1. **Storage**: Real PostgreSQL database (Neon, AWS RDS, etc.)
2. **Architecture**:
   - **Client** (browser) → Vite on port 5173
   - **Backend** (Node.js) → Express on port 3001
   - Client makes fetch calls to `/api/db/{run,all,get}`
   - Backend connects to PostgreSQL with `.env.local` credentials
3. **Migrations**: Execute once on the server, recorded in `_migrations`
4. **Persistence**: Data in PostgreSQL = permanent data in the real database

```bash
npm run dev:remote
# Dev: frontend → Vite proxy (5173) → backend (3001) → PostgreSQL (5432)
# Prod: frontend → backend (same host) → PostgreSQL
```

---

## Users and sessions

Filter all tables by `user_id` for multi-tenancy:

```ts
// In modules — get the user with useSession()
import { useSession } from '../../core/auth/authStore';

const session = useSession();
const userId = session?.user.id;

// Query filtering by user
const { data } = useModuleData<MyType>(
  db,
  'SELECT * FROM my_table WHERE user_id = $1',
  [userId]
);

// In overlays — user arrives as prop
const MyOverlay = ({ user, db }: OverlayProps) => {
  const { data } = useModuleData(db, '... WHERE user_id = $1', [user.id]);
};
```

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

## Workflow Summary

| Step | What to do |
|------|-----------|
| 1. Create module | Copy `_template` → `src/modules/my-module/` |
| 2. Define table | Add migration with `CREATE TABLE` (PostgreSQL syntax) |
| 3. Write component | Use `useModuleData` for reactive queries |
| 4. Import data | `const { data, reload } = useModuleData(...)` |
| 5. Modify data | `await db.run(...)` followed by `await reload()` |
| 6. Register | Add in `src/core/registry/index.ts` |
| 7. Test | `npm run dev:local` (fast) or `npm run dev:remote` (PostgreSQL) |

---

## Key files

- **`.env.local`** — Environment variables (DO NOT commit)
- **`server.js`** — Express backend (remote mode only)
- **`src/core/db/db.ts`** — Database abstraction (local/remote automatic)
- **`src/core/db/migrations.ts`** — Migration system
- **`src/core/hooks/useModuleData.ts`** — Reactive query hook

