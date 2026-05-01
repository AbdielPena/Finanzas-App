// ============================================
// Beneficiaries / Collaborators — Personas ligadas a transacciones y deudas
// ============================================
//
// Modelo:
//   beneficiaries: [{
//     id, nombre, telefono?, email?, notas?, tipo? ('persona'|'empresa'),
//     createdAt, updatedAt
//   }]
//
// Vinculación por entidad:
//   transaction.beneficiarios = [{ personaId, nombre, monto, concepto? }]
//   payable.colaboradores     = [{ personaId, nombre, montoAsignado, montoPagado, pagado }]
//   debt.colaboradores        = [{ personaId, nombre, montoAsignado, montoPagado, pagado }]
//
// Las referencias guardan `nombre` además de `personaId` para que los
// registros sigan siendo legibles aún si la persona fue eliminada del
// directorio más adelante (forward-only, no rompe data existente).
// ============================================

import store from './store.js';
import { generateId } from './utils.js';

const COLLECTION = 'beneficiaries';

// ---------- Normalización ----------
function _normName(s) {
  return (s || '').toString().trim();
}
function _normKey(s) {
  return _normName(s).toLowerCase().replace(/\s+/g, ' ');
}

// ---------- CRUD básico ----------
export function getAllBeneficiarios() {
  return store.getAll(COLLECTION);
}

export function getBeneficiarioById(id) {
  if (!id) return null;
  return store.getById(COLLECTION, id);
}

export function findBeneficiarioByName(nombre) {
  const key = _normKey(nombre);
  if (!key) return null;
  return store.getAll(COLLECTION).find(p => _normKey(p.nombre) === key) || null;
}

export function addBeneficiario(data) {
  const nombre = _normName(data?.nombre);
  if (!nombre) return null;
  // Evitar duplicado exacto
  const existing = findBeneficiarioByName(nombre);
  if (existing) return existing;
  const payload = {
    id: generateId(),
    nombre,
    telefono: data?.telefono || '',
    email: data?.email || '',
    notas: data?.notas || '',
    tipo: data?.tipo || 'persona',
  };
  return store.add(COLLECTION, payload);
}

export function updateBeneficiario(id, updates) {
  return store.update(COLLECTION, id, updates);
}

export function removeBeneficiario(id) {
  store.remove(COLLECTION, id);
}

// Upsert por nombre: si existe devuelve el registro, si no lo crea.
export function upsertBeneficiarioByName(nombre, extras = {}) {
  const clean = _normName(nombre);
  if (!clean) return null;
  const existing = findBeneficiarioByName(clean);
  if (existing) {
    // Completa campos vacíos sin sobrescribir lo existente
    const patch = {};
    if (extras.telefono && !existing.telefono) patch.telefono = extras.telefono;
    if (extras.email && !existing.email) patch.email = extras.email;
    if (Object.keys(patch).length) updateBeneficiario(existing.id, patch);
    return existing;
  }
  return addBeneficiario({ nombre: clean, ...extras });
}

// ---------- Utilidades de splitting ----------
// Dado un monto total y una lista de asignaciones parciales,
// devuelve el monto faltante (puede ser positivo o negativo).
export function calcSplitRemainder(total, assignments = []) {
  const sum = (assignments || []).reduce((s, a) => s + (parseFloat(a.monto || a.montoAsignado) || 0), 0);
  return (parseFloat(total) || 0) - sum;
}

// Divide un total equitativamente entre N personas, con ajuste de centavos
// en la última posición para que la suma cierre exacta.
export function splitEqual(total, n) {
  const safe = Math.max(1, parseInt(n, 10) || 1);
  const t = parseFloat(total) || 0;
  const base = Math.floor((t / safe) * 100) / 100;
  const parts = Array(safe).fill(base);
  const diff = +(t - base * safe).toFixed(2);
  if (parts.length) parts[parts.length - 1] = +(parts[parts.length - 1] + diff).toFixed(2);
  return parts;
}

// ---------- Helpers de lectura consolidada ----------
export function getTransactionsByBeneficiario(personaId) {
  if (!personaId) return [];
  return store.filter('transactions', t =>
    Array.isArray(t.beneficiarios) && t.beneficiarios.some(b => b.personaId === personaId)
  );
}

export function getPayablesByColaborador(personaId) {
  if (!personaId) return [];
  return store.filter('payables', p =>
    Array.isArray(p.colaboradores) && p.colaboradores.some(c => c.personaId === personaId)
  );
}

// Resumen total adeudado/asignado a una persona a través de payables
export function summarizeColaborador(personaId) {
  const payables = getPayablesByColaborador(personaId);
  let asignado = 0;
  let pagado = 0;
  payables.forEach(p => {
    (p.colaboradores || []).forEach(c => {
      if (c.personaId !== personaId) return;
      asignado += parseFloat(c.montoAsignado) || 0;
      pagado += parseFloat(c.montoPagado) || 0;
    });
  });
  return { asignado, pagado, pendiente: Math.max(0, asignado - pagado), count: payables.length };
}

export default {
  getAllBeneficiarios,
  getBeneficiarioById,
  findBeneficiarioByName,
  addBeneficiario,
  updateBeneficiario,
  removeBeneficiario,
  upsertBeneficiarioByName,
  calcSplitRemainder,
  splitEqual,
  getTransactionsByBeneficiario,
  getPayablesByColaborador,
  summarizeColaborador,
};
