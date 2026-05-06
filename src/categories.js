// ============================================
// Categories — Default categories + management
// ============================================
import store from './store.js';
import { generateId } from './utils.js';

const DEFAULT_CATEGORIES = [
  // Ingresos
  { id: 'cat_salary', nombre: 'Salario', icono: '💰', color: '#00e676', tipo: 'ingreso', esSistema: true },
  { id: 'cat_freelance', nombre: 'Freelance', icono: '💻', color: '#69f0ae', tipo: 'ingreso', esSistema: true },
  { id: 'cat_investment', nombre: 'Inversiones', icono: '📈', color: '#00bcd4', tipo: 'ingreso', esSistema: true },
  { id: 'cat_clients', nombre: 'Clientes', icono: '👥', color: '#81c784', tipo: 'ingreso', esSistema: true },
  { id: 'cat_gift', nombre: 'Regalos', icono: '🎁', color: '#ab47bc', tipo: 'ingreso', esSistema: true },
  { id: 'cat_other_income', nombre: 'Otros Ingresos', icono: '💵', color: '#66bb6a', tipo: 'ingreso', esSistema: true },
  // Gastos
  { id: 'cat_food', nombre: 'Alimentación', icono: '🍔', color: '#ff7043', tipo: 'gasto', esSistema: true },
  { id: 'cat_transport', nombre: 'Transporte', icono: '🚗', color: '#42a5f5', tipo: 'gasto', esSistema: true },
  { id: 'cat_home', nombre: 'Hogar', icono: '🏠', color: '#ffa726', tipo: 'gasto', esSistema: true },
  { id: 'cat_health', nombre: 'Salud', icono: '🏥', color: '#ef5350', tipo: 'gasto', esSistema: true },
  { id: 'cat_education', nombre: 'Educación', icono: '📚', color: '#5c6bc0', tipo: 'gasto', esSistema: true },
  { id: 'cat_entertainment', nombre: 'Entretenimiento', icono: '🎮', color: '#ec407a', tipo: 'gasto', esSistema: true },
  { id: 'cat_clothing', nombre: 'Ropa', icono: '👕', color: '#8d6e63', tipo: 'gasto', esSistema: true },
  { id: 'cat_services', nombre: 'Servicios', icono: '📱', color: '#26a69a', tipo: 'gasto', esSistema: true },
  { id: 'cat_subscriptions', nombre: 'Suscripciones', icono: '🔄', color: '#7e57c2', tipo: 'gasto', esSistema: true },
  { id: 'cat_personal', nombre: 'Personal', icono: '🧴', color: '#78909c', tipo: 'gasto', esSistema: true },
  { id: 'cat_debt_payment', nombre: 'Pago de Deudas', icono: '📋', color: '#ff5252', tipo: 'gasto', esSistema: true },
  { id: 'cat_loan_amortization', nombre: 'Préstamo (Amortización)', icono: '🏦', color: '#3f51b5', tipo: 'gasto', esSistema: true },
  { id: 'cat_other_expense', nombre: 'Otros Gastos', icono: '📦', color: '#bdbdbd', tipo: 'gasto', esSistema: true },
  // Ambos
  { id: 'cat_transfer', nombre: 'Transferencia', icono: '↔️', color: '#90a4ae', tipo: 'ambos', esSistema: true },
  { id: 'cat_tithe', nombre: 'Diezmo/10%', icono: '❤️', color: '#e91e63', tipo: 'gasto', esSistema: true },
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

export function getCategoryOptions(tipo = null) {
  return getCategories(tipo).map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
}
