# Guía de componentes — Modular Workspace

Hay dos tipos de componentes que puedes crear:

| Tipo | Dónde vive | Ejemplo |
|------|-----------|---------|
| **Módulo** | Panel del dashboard, side-by-side con otros | Kanban, Demo |
| **Overlay** | Botón flotante sobre toda la UI | Chat, Notas |

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
  icon:        '🧩',            // emoji o ReactNode

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
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          valor     TEXT    NOT NULL,
          creado_en TEXT    NOT NULL DEFAULT (datetime('now'))
        );
      `,
    },
  ],
};
```

**3.** Escribe el componente:
```tsx
const MiModuloComponent = ({ db, dark }: ModuleProps) => {
  const [items, setItems] = useState<MiTipo[]>([]);

  useEffect(() => {
    setItems(db.all<MiTipo>('SELECT * FROM mi_tabla ORDER BY id DESC'));
  }, [db]);

  return (
    <div style={ms.container}>
      {/* usa ms.* para estilos consistentes con el tema */}
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
src/overlays/mi-overlay/
└── index.tsx
```

### Descriptor
```ts
export const MiOverlay: OverlayWidget = {
  id:            'mi-overlay',
  component:     MiOverlayComponent,
  defaultCorner: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  panelWidth:    340,             // ← IMPORTANTE: el OverlayLayer lo usa para posicionar el panel
  panelHeight:   480,             // ← IMPORTANTE: ídem
  migrations:    [],
};
```

### Componente
```tsx
function MiOverlayComponent({
  db, user,
  panelX, panelY,       // coordenadas del panel relativas al shell — NO calcules esto tú
  didDragRef,           // ref compartido: true si el mouseup fue drag, no click
  onDragStart,          // pasar al onMouseDown del FAB
  onPanelOpen,          // llamar cuando el panel se abre
  onPanelClose,         // llamar cuando el panel se cierra
}: OverlayProps) {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    if (didDragRef.current) return;  // ignora si fue drag
    const next = !open;
    setOpen(next);
    next ? onPanelOpen() : onPanelClose();
  };

  return (
    <>
      {/* Panel — position:absolute, coords dadas por OverlayLayer */}
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}  // evita que el panel active el drag
          style={{
            position: 'absolute',
            left: `${panelX}px`,
            top:  `${panelY}px`,
            zIndex: 300,
            width: `${PANEL_W}px`,
            height: `${PANEL_H}px`,
            // ... resto de estilos
          }}
        >
          {/* contenido */}
        </div>
      )}

      {/* FAB — onMouseDown activa el drag en OverlayLayer */}
      <button
        onMouseDown={onDragStart}   // ← activa drag
        onClick={toggleOpen}        // ← abre/cierra panel (solo si no fue drag)
        style={{
          position: 'absolute', left: 0, top: 0,
          width: `${FAB_SIZE}px`, height: `${FAB_SIZE}px`,
          borderRadius: '22px',
          cursor: 'grab',
          pointerEvents: 'auto',
          // ...
        }}
      >
        {open ? <X size={22}/> : <MiIcono size={22}/>}
      </button>
    </>
  );
}
```

### Cómo funciona el posicionamiento

El `OverlayLayer` calcula automáticamente:

- **Posición del FAB** — esquina asignada (`defaultCorner`) con apilado automático si hay varios en la misma esquina
- **Posición del panel** — al lado del FAB, alineado verticalmente:
  - FAB a la izquierda → panel a su derecha
  - FAB a la derecha → panel a su izquierda
  - FAB arriba → panel alineado al tope del FAB
  - FAB abajo → panel alineado al fondo del FAB
- **Drag & snap** — al soltar, el FAB se ancla a la esquina más cercana con animación spring
- **Apilado** — si hay varios overlays en la misma esquina se colocan uno encima del otro sin solaparse
- **Z-index** — el overlay con el panel abierto sube automáticamente al tope

**El componente no necesita calcular nada de esto** — solo usa `panelX`/`panelY` tal como llegan.

### Registra en `src/core/overlay/overlayRegistry.ts`:
```ts
import { MiOverlay } from '../../overlays/mi-overlay';

const OVERLAYS: OverlayWidget[] = [
  ChatOverlay,
  NotesOverlay,
  MiOverlay,   // ← aquí
];
```

---

## Props disponibles

### ModuleProps (módulos de dashboard)
```ts
interface ModuleProps {
  db:      DbApi;    // base de datos lista para usar
  dark?:   boolean;
  config?: Record<string, unknown>;
}
// Nota: para el usuario usa useSession() dentro del componente
```

### OverlayProps (overlays flotantes)
```ts
interface OverlayProps {
  db:             DbApi;
  user:           User;           // siempre disponible en overlays
  dark?:          boolean;
  panelX:         number;         // posición del panel (relativa al shell)
  panelY:         number;         // calculada por OverlayLayer — úsala directamente
  didDragRef:     RefObject<boolean>; // lee .current en onClick para distinguir drag de click
  onDragStart:    (e: React.MouseEvent) => void;
  onPanelOpen:    () => void;
  onPanelClose:   () => void;
}
```

---

## API de base de datos (`db`)

```ts
// Escritura — retorna lastInsertRowid
db.run('INSERT INTO mi_tabla (valor) VALUES (?)', ['hola'])

// Lectura múltiple
db.all<MiTipo>('SELECT * FROM mi_tabla ORDER BY id DESC')

// Lectura una fila
db.get<MiTipo>('SELECT * FROM mi_tabla WHERE id = ?', [1])
```

**Importante con SQLite WASM:** usa siempre comillas simples en el SQL para literales de string:
```ts
// ✅ correcto
db.run("UPDATE tabla SET editado_en=datetime('now') WHERE id=?", [id])

// ❌ incorrecto — comillas dobles dentro de template string
db.run(`UPDATE tabla SET editado_en=datetime("now") WHERE id=?`, [id])
```

Los datos se guardan automáticamente en `localStorage` después de cada `db.run()` y se restauran al recargar.

---

## Usuario en sesión (`useSession`)

Disponible desde cualquier componente de módulo:
```ts
import { useSession } from '../../core/auth/authStore';

const session = useSession(); // Session | null

if (session) {
  session.user.id            // number
  session.user.username      // string
  session.user.display_name  // string
}
```

En overlays el usuario llega directamente como prop `user: User` (siempre disponible porque los overlays solo se montan con sesión activa).

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

## Resumen — archivos a tocar

| Qué crear | Archivo nuevo | Archivo a editar |
|-----------|--------------|-----------------|
| Módulo dashboard | `src/modules/mi-modulo/index.tsx` | `src/core/registry/index.ts` |
| Overlay flotante | `src/overlays/mi-overlay/index.tsx` | `src/core/overlay/overlayRegistry.ts` |
