// ============================================
// Categories — Default categories + management
// ============================================
import store from './store.js';
import { generateId } from './utils.js';

// La columna del icono en backend se llama `emoji` (esquema postgres
// categories.emoji). Mantengo `icono` como alias por compatibilidad
// con cache local viejo, pero el field canonico que persistira es `emoji`.
const DEFAULT_CATEGORIES = [
  // Ingresos
  { nombre: 'Salario', emoji: '💰', color: '#00e676', tipo: 'ingreso', esSistema: true },
  { nombre: 'Freelance', emoji: '💻', color: '#69f0ae', tipo: 'ingreso', esSistema: true },
  { nombre: 'Inversiones', emoji: '📈', color: '#00bcd4', tipo: 'ingreso', esSistema: true },
  { nombre: 'Clientes', emoji: '👥', color: '#81c784', tipo: 'ingreso', esSistema: true },
  { nombre: 'Regalos', emoji: '🎁', color: '#ab47bc', tipo: 'ingreso', esSistema: true },
  { nombre: 'Otros Ingresos', emoji: '💵', color: '#66bb6a', tipo: 'ingreso', esSistema: true },
  // Gastos
  { nombre: 'Alimentación', emoji: '🍔', color: '#ff7043', tipo: 'gasto', esSistema: true },
  { nombre: 'Transporte', emoji: '🚗', color: '#42a5f5', tipo: 'gasto', esSistema: true },
  { nombre: 'Hogar', emoji: '🏠', color: '#ffa726', tipo: 'gasto', esSistema: true },
  { nombre: 'Salud', emoji: '🏥', color: '#ef5350', tipo: 'gasto', esSistema: true },
  { nombre: 'Educación', emoji: '📚', color: '#5c6bc0', tipo: 'gasto', esSistema: true },
  { nombre: 'Entretenimiento', emoji: '🎮', color: '#ec407a', tipo: 'gasto', esSistema: true },
  { nombre: 'Ropa', emoji: '👕', color: '#8d6e63', tipo: 'gasto', esSistema: true },
  { nombre: 'Servicios', emoji: '📱', color: '#26a69a', tipo: 'gasto', esSistema: true },
  { nombre: 'Suscripciones', emoji: '🔄', color: '#7e57c2', tipo: 'gasto', esSistema: true },
  { nombre: 'Personal', emoji: '🧴', color: '#78909c', tipo: 'gasto', esSistema: true },
  { nombre: 'Pago de Deudas', emoji: '📋', color: '#ff5252', tipo: 'gasto', esSistema: true },
  { nombre: 'Préstamo (Amortización)', emoji: '🏦', color: '#3f51b5', tipo: 'gasto', esSistema: true },
  { nombre: 'Otros Gastos', emoji: '📦', color: '#bdbdbd', tipo: 'gasto', esSistema: true },
  // Ambos
  { nombre: 'Transferencia', emoji: '↔️', color: '#90a4ae', tipo: 'ambos', esSistema: true },
  { nombre: 'Diezmo/10%', emoji: '❤️', color: '#e91e63', tipo: 'gasto', esSistema: true },
];

// Normaliza nombres para matchear sin importar tildes/mayusculas
function normName(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function initCategories() {
  const existing = store.getAll('categories');

  // Backend modo: si ya hay categorias (probablemente con UUID real),
  // NO inyectamos los hardcoded `cat_xxx` porque romperian las queries
  // (Postgres rechaza esos ids en columnas UUID y la unique constraint
  //  workspace_id+nombre rechaza creates duplicados).
  if (existing.length > 0) {
    // Solo agregamos categorias por NOMBRE que no existan, dejando que
    // el backend asigne sus UUIDs. Nunca pasamos `id: cat_xxx`.
    const existingNames = new Set(existing.map(c => normName(c.nombre)));
    DEFAULT_CATEGORIES.forEach(dc => {
      if (!existingNames.has(normName(dc.nombre))) {
        // store.add genera un UUID automaticamente y omite el `id` hardcoded.
        const { id: _drop, ...rest } = dc;
        store.add('categories', rest);
      }
    });
    return;
  }

  // Modo offline / sin backend: poblar el cache con los DEFAULT_CATEGORIES.
  // Estos sirven como placeholder hasta que se sincronice con el servidor.
  store.save('categories', DEFAULT_CATEGORIES.map(c => ({
    ...c,
    createdAt: new Date().toISOString(),
  })));
}

export function getCategories(tipo = null) {
  const cats = store.getAll('categories');
  if (!tipo) return cats;
  return cats.filter(c => c.tipo === tipo || c.tipo === 'ambos');
}

export function getCategoryById(id) {
  return store.getById('categories', id);
}

export function addCategory(data) {
  return store.add('categories', { ...data, id: generateId(), esSistema: false });
}

export function updateCategory(id, data) {
  return store.update('categories', id, data);
}

export function deleteCategory(id) {
  const cat = store.getById('categories', id);
  if (cat?.esSistema) return false;
  store.remove('categories', id);
  return true;
}

// Helper: el campo del icono cambia segun la fuente de datos.
// Backend usa `emoji` (esquema postgres categories.emoji), el legacy
// frontend usaba `icono`. Devolvemos el primero que exista, o '' si nada.
export function categoryIcon(c) {
  return c?.emoji || c?.icono || '';
}

export function getCategoryOptions(tipo = null) {
  return getCategories(tipo).map(c => {
    const icon = categoryIcon(c);
    const prefix = icon ? `${icon} ` : '';
    return `<option value="${c.id}">${prefix}${c.nombre || ''}</option>`;
  }).join('');
}
