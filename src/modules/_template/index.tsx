// src/modules/_template/index.tsx
// ══════════════════════════════════════════════════════════════
//  PLANTILLA — copia esta carpeta para crear un nuevo módulo
//
//  1. Copia src/modules/_template → src/modules/tu-modulo
//  2. Cambia id, name, description, icon
//  3. Elige defaultCols (1-12) y defaultRows (altura en celdas)
//  4. Agrega tu componente
//  5. Si necesitas BD: agrega migrations[] con tus CREATE TABLE
//  6. Importa y registra en src/core/registry/index.ts
// ══════════════════════════════════════════════════════════════

import { ms } from '../../core/styles/tokens';
import type { AppModule, ModuleProps } from '../../core/types/module';

const MyModuleComponent = ({ dark: _dark, db: _db }: ModuleProps) => {
  // `db` ya está inicializado — úsalo directo:
  //   db.run('INSERT INTO mi_tabla (col) VALUES (?)', [valor])
  //   db.all<MiTipo>('SELECT * FROM mi_tabla')
  //   db.get<MiTipo>('SELECT * FROM mi_tabla WHERE id = ?', [id])

  return (
    <div style={ms.container}>
      <span style={ms.label}>My Section</span>
      <div style={ms.card}>
        <p style={ms.title}>Card title</p>
        <p style={ms.muted}>Description text.</p>
      </div>
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <input type="text" placeholder="Type…" style={{ ...ms.input, flex: 1 }} />
        <button style={ms.btn.primary}>Save</button>
      </div>
      <div style={ms.list}>
        <div style={ms.empty}>Nothing here yet.</div>
      </div>
    </div>
  );
};

export const MyModule: AppModule = {
  id:          'my-module',        // ← único en toda la app
  name:        'My Module',
  description: 'Short description',
  icon:        '🧩',

  component: MyModuleComponent,

  layout: {
    defaultCols: 6,   // columnas del grid (1–12). 6 = mitad del ancho
    defaultRows: 4,   // filas del grid. Más = más alto por defecto
    isMinimizable: true,
    canExpandFull:  false,
  },

  // Opcional — define tus tablas aquí:
  migrations: [
    // {
    //   version: 1,
    //   sql: `CREATE TABLE IF NOT EXISTS mi_tabla (
    //     id    INTEGER PRIMARY KEY AUTOINCREMENT,
    //     valor TEXT NOT NULL
    //   );`,
    // },
  ],
};