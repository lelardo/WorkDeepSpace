import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Pool
const pool = new Pool({
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'modular_workspace',
  user: process.env.VITE_DB_USER || 'postgres',
  password: process.env.VITE_DB_PASSWORD || 'postgres',
  ssl: process.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[pool] unexpected error:', err);
});

// Initialize _migrations table
async function initMigrationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        module_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (module_id, version)
      );
    `);
    console.log('[db] ✓ _migrations table ready');
  } catch (e) {
    console.error('[db] ✗ Failed to initialize _migrations table:', e.message);
  }
}

// Initialize on startup
initMigrationsTable();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Execute query (INSERT, UPDATE, DELETE, CREATE TABLE, etc)
app.post('/api/db/run', async (req, res) => {
  const { sql, params = [] } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql required' });

  try {
    const result = await pool.query(sql, params);
    res.json({ rowCount: result.rowCount || 0 });
  } catch (e) {
    console.error('[api:run]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Fetch all rows
app.post('/api/db/all', async (req, res) => {
  const { sql, params = [] } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql required' });

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows || []);
  } catch (e) {
    console.error('[api:all]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Fetch single row
app.post('/api/db/get', async (req, res) => {
  const { sql, params = [] } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql required' });

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows?.[0] || null);
  } catch (e) {
    console.error('[api:get]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Run migrations for a module
app.post('/api/migrations/run', async (req, res) => {
  const { moduleId, migrations } = req.body;
  if (!moduleId || !Array.isArray(migrations)) {
    return res.status(400).json({ error: 'moduleId and migrations array required' });
  }

  try {
    // Check which migrations have already run
    const result = await pool.query(
      'SELECT version FROM _migrations WHERE module_id = $1 ORDER BY version',
      [moduleId]
    );
    const ranVersions = result.rows.map(r => r.version);

    // Filter pending migrations
    const pending = migrations.filter(m => !ranVersions.includes(m.version));

    // Execute each pending migration
    for (const m of pending) {
      console.log(`[migrations] running ${moduleId} v${m.version}`);

      // Split multi-statement SQL (same as client)
      const statements = m.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        await pool.query(stmt);
      }

      // Record migration
      await pool.query(
        'INSERT INTO _migrations (module_id, version) VALUES ($1, $2)',
        [moduleId, m.version]
      );
    }

    res.json({ ran: pending.length, total: migrations.length });
  } catch (e) {
    console.error('[api:migrations:run]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Servir archivos estáticos desde dist/ (para Electron)
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback - sirve index.html para rutas desconocidas
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[api] ✓ Server listening on port ${PORT}`);
  console.log(`[api] PostgreSQL: ${process.env.VITE_DB_HOST}:${process.env.VITE_DB_PORT}/${process.env.VITE_DB_NAME}`);
});
