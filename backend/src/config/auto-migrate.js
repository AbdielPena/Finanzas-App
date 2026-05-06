// ============================================================
// Auto-migrate — corre los .sql idempotentes de db/migrations/
// al arranque del backend. Sirve para parchar tablas o columnas
// faltantes en producción sin SSH.
//
// Solo ejecuta archivos *.sql que sean idempotentes (CREATE TABLE
// IF NOT EXISTS, ALTER TABLE ... ADD COLUMN IF NOT EXISTS, etc.).
// Los .cjs / pg-migrate los maneja node-pg-migrate aparte.
// ============================================================
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'db', 'migrations');

export async function runStartupMigrations() {
  let files;
  try {
    files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();
  } catch (e) {
    console.warn('[auto-migrate] no se pudo leer carpeta de migraciones:', e.message);
    return;
  }

  if (files.length === 0) {
    console.log('[auto-migrate] sin migraciones .sql idempotentes que aplicar');
    return;
  }

  for (const f of files) {
    const path = join(MIGRATIONS_DIR, f);
    try {
      const sql = await readFile(path, 'utf8');
      await query(sql);
      console.log(`[auto-migrate] aplicada: ${f}`);
    } catch (e) {
      // Errores comunes (tabla ya existe, columna ya existe) los ignoramos
      // si la migration es idempotente. Si fue otra cosa, lo logueamos pero
      // no tumbamos el server (mejor un backend roto en una sola feature
      // que un backend que no arranca).
      if (/already exists|duplicate column/i.test(e.message)) {
        console.log(`[auto-migrate] ${f}: ya estaba aplicada`);
      } else {
        console.warn(`[auto-migrate] error aplicando ${f}:`, e.message);
      }
    }
  }
}

export default { runStartupMigrations };
