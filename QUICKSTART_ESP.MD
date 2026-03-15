# Guía de componentes — Modular Workspace

Hay dos tipos de componentes que puedes crear:

| Tipo | Dónde vive | Ejemplo |
|------|-----------|---------|
| **Módulo** | Panel del dashboard, side-by-side con otros | Kanban, Demo |
| **Overlay** | Botón flotante sobre toda la UI | Chat, Notas |

---

## Sistema de Base de Datos

**WorkDeepSpace** soporta dos modos de persistencia:

| Modo | Uso | Almacenamiento | Conexión |
|------|-----|-----------------|----------|
| **Local (Desarrollo)** | `npm run dev:local` | PGlite (WASM) → IndexedDB | En-proceso |
| **Remote (Producción)** | `npm run dev:remote` | PostgreSQL (Neon, AWS RDS, etc.) | API Backend |

### Configuración — `.env.local`

```env
# ← Modo de operación
VITE_DB_MODE=local        # o 'remote'

# Si VITE_DB_MODE=remote, configura la conexión:
VITE_DB_HOST=tu-postgres-host
VITE_DB_PORT=5432
VITE_DB_NAME=nombre_tu_base_datos
VITE_DB_USER=tu_usuario
VITE_DB_PASSWORD=tu_password
VITE_DB_SSL=true           # o false si conectas localmente

# Puerto del servidor API (solo remote)
API_PORT=3001
```

### Autodetección de modo

El framework detecta automáticamente el modo desde `VITE_DB_MODE`:
- **local**: PGlite en el navegador, datos persistidos en IndexedDB
- **remote**: Requests HTTP a `http://localhost:3001/api/db/*` (dev) o al mismo host (prod)

### Scripts de desarrollo

```bash
npm run dev:local       # Solo Vite + PGlite (desarrollo rápido)
npm run dev:remote      # Servidor Node.js + Vite (dev con PostgreSQL real)
npm run build           # Producción (compilado, requiere backend Node en prod)
```

---

## TIPO 1 — Módulo de dashboard

### Estructura
```
src/modules/mi-modulo/
└── index.tsx
```

### Pasos

**1.** Copia `src/modules/_template/` → `src/modules/mi-modulo/`

**2.** Edita el descriptor al fondo del archivo:
```ts
export const MiModulo: AppModule = {
  id:          'mi-modulo',     // único en toda la app — sin espacios
  name:        'Mi Módulo',
  description: 'Qué hace',
  icon:        <MiIcono size={20} />, // icono de lucide-react

  component: MiModuloComponent,

  layout: {
    defaultCols:   6,    // columnas iniciales (1–12). 6 = mitad, 12 = fila completa
    defaultRows:   4,    // peso de altura al distribuir filas
    isMinimizable: true,
    canExpandFull: true,
  },

  migrations: [
    {
      version: 1,        // NUNCA edites versiones existentes, solo agrega nuevas
      sql: `
        CREATE TABLE IF NOT EXISTS mi_tabla (
          id        SERIAL PRIMARY KEY,
          valor     TEXT    NOT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    },
  ],
};
```

**⚠️ Importante — PostgreSQL syntax:**
- `SERIAL PRIMARY KEY` (no `AUTOINCREMENT`)
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (no `datetime('now')`)
- Parámetros: `$1, $2, $3...` (no `?`)

**3.** Escribe el componente usando `useModuleData`:
```tsx
import { useModuleData } from '../../core/hooks/useModuleData';

const MiModuloComponent = ({ db, dark }: ModuleProps) => {
  const { data: items, loading, error, reload } = useModuleData<MiTipo>(
    db,
    'SELECT * FROM mi_tabla ORDER BY id DESC'
  );

  const addItem = async () => {
    if (!db) return;
    await db.run(
      'INSERT INTO mi_tabla (valor) VALUES ($1)',
      ['nuevo valor']
    );
    await reload();  // ← importante: espera a que reload complete
  };

  return (
    <div style={ms.container}>
      {loading ? (
        <div style={ms.empty}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={ms.empty}>Sin datos</div>
      ) : (
        items.map(item => /* renderizar */)
      )}
    </div>
  );
};
```

**4.** Registra en `src/core/registry/index.ts`:
```ts
import { MiModulo } from '../../modules/mi-modulo';

const MODULES: AppModule[] = [
  DemoModule,
  KanbanModule,
  MiModulo,   // ← aquí
];
```

---

## TIPO 2 — Overlay flotante

Los overlays son botones flotantes (FAB) que el usuario puede arrastrar y anclar en cualquier esquina de la pantalla. Al hacer click abren un panel que aparece **al lado** del botón, alineado verticalmente con él.

El `OverlayLayer` gestiona toda la lógica de posición, drag, snap y apilado. El componente solo recibe coordenadas listas para usar.

### Estructura
```
src/overlay_modules/mi-overlay/
└── index.tsx
```

### Descriptor
```ts
export const MiOverlay: OverlayWidget = {
  id:            'mi-overlay',
  component:     MiOverlayComponent,
  defaultCorner: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  panelWidth:    340,
  panelHeight:   480,
  migrations:    [],
};
```

### Componente con persistencia
```tsx
import { useModuleData } from '../../core/hooks/useModuleData';

function MiOverlayComponent({
  db, user,
  panelX, panelY,
  didDragRef,
  onDragStart,
  onPanelOpen,
  onPanelClose,
}: OverlayProps) {
  const [open, setOpen] = useState(false);
  const { data: items, reload } = useModuleData<MiTipo>(
    db,
    'SELECT * FROM mi_tabla WHERE user_id = $1 ORDER BY id DESC',
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
      'INSERT INTO mi_tabla (user_id, valor) VALUES ($1, $2)',
      [user.id, 'nuevo']
    );
    await reload();  // ← espera siempre
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
            // ... estilos
          }}
        >
          {/* contenido — usa items */}
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
        {open ? <X size={22}/> : <MiIcono size={22}/>}
      </button>
    </>
  );
}
```

### Registra en `src/core/overlay/overlayRegistry.ts`:
```ts
import { MiOverlay } from '../../overlay_modules/mi-overlay';

const OVERLAYS: OverlayWidget[] = [
  ChatOverlay,
  NotesOverlay,
  MiOverlay,   // ← aquí
];
```

---

## API de base de datos (`db`)

Todas las operaciones son **async** — siempre usa `await`:

```ts
// Escritura — INSERT, UPDATE, DELETE, CREATE TABLE
await db.run('INSERT INTO mi_tabla (valor) VALUES ($1)', ['hello'])

// Lectura múltiple — retorna array
const items = await db.all<MiTipo>('SELECT * FROM mi_tabla ORDER BY id DESC')

// Lectura una fila — retorna objeto o undefined
const item = await db.get<MiTipo>('SELECT * FROM mi_tabla WHERE id = $1', [1])
```

**Parámetros:** Usa siempre `$1, $2, $3...` (PostgreSQL style):
```ts
// ✅ correcto
await db.run("UPDATE tabla SET valor=$1, editado_en=CURRENT_TIMESTAMP WHERE id=$2", ['nuevo', 5])

// ❌ incorrecto (SQLite style)
await db.run("UPDATE tabla SET valor=?, editado_en=datetime('now') WHERE id=?", ['nuevo', 5])
```

---

## Hook reactivo — `useModuleData`

Ejecuta una query y reactualiza automáticamente:

```ts
import { useModuleData } from '../../core/hooks/useModuleData';

const { data, loading, error, reload } = useModuleData<MiTipo>(
  db,
  'SELECT * FROM mi_tabla WHERE estado = $1',
  ['activo'],  // parámetros
  []           // dependencias opcionales
);

// Dentro de un handler (crear, editar, eliminar):
const handleAdd = async () => {
  await db.run('INSERT INTO mi_tabla VALUES ...', [...]);
  await reload();  // ← actualiza data automáticamente
};
```

**Propiedades:**
- `data: MiTipo[]` — resultados de la query
- `loading: boolean` — true mientras se ejecuta
- `error: Error | null` — error si hay
- `reload: () => Promise<void>` — ejecuta la query nuevamente

---

## Persistencia — Cómo funciona

### Modo Local (PGlite)

1. **Almacenamiento**: IndexedDB del navegador
2. **Ciclo de vida**:
   - App inicia → PGlite crea BD en memoria
   - Tablas se crean vía migraciones
   - Cada operación se sincroniza a IndexedDB automáticamente
   - Al recargar → se restaura desde IndexedDB
3. **Datos persistentes entre sesiones**: Sí (salvo que limpies IndexedDB)

```bash
npm run dev:local
# Datos viven en: IndexedDB → idb://modular-workspace
```

### Modo Remote (PostgreSQL + API)

1. **Almacenamiento**: Base de datos PostgreSQL real (Neon, AWS RDS, etc.)
2. **Arquitectura**:
   - **Cliente** (navegador) → Vite en puerto 5173
   - **Backend** (Node.js) → Express en puerto 3001
   - El cliente hace fetch calls a `/api/db/{run,all,get}`
   - El backend conecta a PostgreSQL con las credenciales de `.env.local`
3. **Migraciones**: Se ejecutan una sola vez en el servidor y se registran en `_migrations`
4. **Persistencia**: Datos en PostgreSQL = datos permanentes en la base de datos real

```bash
npm run dev:remote
# Dev: frontend → Vite proxy (5173) → backend (3001) → PostgreSQL (5432)
# Prod: frontend → backend (mismo host) → PostgreSQL
```

---

## Usuarios y sesiones

Todas las tablas filtrar por `user_id` para multi-tenancy:

```ts
// En módulos — obtén el user con useSession()
import { useSession } from '../../core/auth/authStore';

const session = useSession();
const userId = session?.user.id;

// Query filtrando por usuario
const { data } = useModuleData<MiTipo>(
  db,
  'SELECT * FROM mi_tabla WHERE user_id = $1',
  [userId]
);

// En overlays — user llega como prop
const MiOverlay = ({ user, db }: OverlayProps) => {
  const { data } = useModuleData(db, '... WHERE user_id = $1', [user.id]);
};
```

---

## Tokens de estilo (`ms`)

```ts
import { ms } from '../../core/styles/tokens';
```

| Token | Uso |
|-------|-----|
| `ms.container` | Wrapper principal (flex col, padding, scroll, height 100%) |
| `ms.card` | Tarjeta con borde y fondo elevado |
| `ms.label` | Etiqueta de sección (uppercase, pequeña) |
| `ms.title` | Título |
| `ms.body` | Texto normal |
| `ms.muted` | Texto secundario |
| `ms.divider` | Línea separadora horizontal |
| `ms.input` | Input de texto |
| `ms.select` | Dropdown |
| `ms.textarea` | Área de texto |
| `ms.btn.primary` | Botón azul |
| `ms.btn.secondary` | Botón con borde |
| `ms.btn.ghost` | Botón icono transparente |
| `ms.btn.danger` | Botón rojo |
| `ms.badge('info'\|'success'\|'warning'\|'danger'\|'default')` | Badge/pill |
| `ms.list` | Contenedor de lista scrolleable |
| `ms.empty` | Estado vacío centrado |
| `ms.row` | Fila flex con gap |

Todos usan variables CSS (`var(--text)`, `var(--bg-card)`, etc.) — responden automáticamente al modo oscuro/claro sin ninguna prop adicional.

---

## Resumen — Flujo de trabajo

| Paso | Qué hacer |
|------|-----------|
| 1. Crear módulo | Copiar `_template` → `src/modules/mi-modulo/` |
| 2. Definir tabla | Agregar migration con `CREATE TABLE` (PostgreSQL syntax) |
| 3. Escribir componente | Usar `useModuleData` para queries reactivas |
| 4. Importar datos | `const { data, reload } = useModuleData(...)` |
| 5. Modificar datos | `await db.run(...)` seguido de `await reload()` |
| 6. Registrar | Agregar en `src/core/registry/index.ts` |
| 7. Probar | `npm run dev:local` (rápido) o `npm run dev:remote` (PostgreSQL) |

---

## Archivos clave

- **`.env.local`** — Variables de entorno (NO commitear)
- **`server.js`** — Backend Express (solo en modo remote)
- **`src/core/db/db.ts`** — Abstracción de BD (local/remote automático)
- **`src/core/db/migrations.ts`** — Sistema de migraciones
- **`src/core/hooks/useModuleData.ts`** — Hook reactivo para queries

