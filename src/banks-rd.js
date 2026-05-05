// ============================================================
// Bancos y entidades financieras de República Dominicana
// Lista compartida — usada en accounts, cards, external_cards,
// debts, subscriptions, transactions, etc.
// ============================================================

export const BANCOS_RD = [
  // Bancos múltiples
  { id: 'popular', nombre: 'Banco Popular Dominicano', tipo: 'banco' },
  { id: 'banreservas', nombre: 'Banreservas', tipo: 'banco' },
  { id: 'bhd', nombre: 'Banco BHD', tipo: 'banco' },
  { id: 'santa-cruz', nombre: 'Banco Santa Cruz', tipo: 'banco' },
  { id: 'scotiabank', nombre: 'Scotiabank República Dominicana', tipo: 'banco' },
  { id: 'banco-caribe', nombre: 'Banco Caribe', tipo: 'banco' },
  { id: 'lopez-de-haro', nombre: 'Banco López de Haro', tipo: 'banco' },
  { id: 'promerica', nombre: 'Banco Promerica', tipo: 'banco' },
  { id: 'ademi', nombre: 'Banco Ademi', tipo: 'banco' },
  { id: 'vimenca', nombre: 'Banco Vimenca', tipo: 'banco' },
  { id: 'lafise', nombre: 'Banco Lafise', tipo: 'banco' },
  { id: 'bdi', nombre: 'Banco BDI', tipo: 'banco' },
  { id: 'activo-dominicana', nombre: 'Banco Múltiple Activo Dominicana', tipo: 'banco' },
  { id: 'union', nombre: 'Banco Unión', tipo: 'banco' },
  { id: 'confisa', nombre: 'Banco Confisa', tipo: 'banco' },
  { id: 'fihogar', nombre: 'Banco Fihogar', tipo: 'banco' },
  // Asociaciones de ahorros y préstamos
  { id: 'alaver', nombre: 'Alaver', tipo: 'asociacion' },
  { id: 'apap', nombre: 'Asociación Popular de Ahorros y Préstamos', tipo: 'asociacion' },
  { id: 'acap', nombre: 'Asociación Cibao de Ahorros y Préstamos', tipo: 'asociacion' },
  { id: 'la-nacional', nombre: 'Asociación La Nacional de Ahorros y Préstamos', tipo: 'asociacion' },
  { id: 'duarte', nombre: 'Asociación Duarte de Ahorros y Préstamos', tipo: 'asociacion' },
  { id: 'mocana', nombre: 'Asociación Mocana de Ahorros y Préstamos', tipo: 'asociacion' },
  // Cooperativas
  { id: 'coopreservas', nombre: 'CoopReservas', tipo: 'cooperativa' },
  // Otra (siempre al final)
  { id: 'otro', nombre: 'Otra entidad', tipo: 'otro' },
];

/**
 * Devuelve el nombre del banco dado su id, o el id si no se encontró.
 * Si el id es 'otro', se espera que `customName` esté presente y se devuelve ese.
 */
export function getBankName(id, customName = null) {
  if (id === 'otro' && customName) return customName;
  const b = BANCOS_RD.find((x) => x.id === id);
  return b ? b.nombre : (customName || id || '');
}

/**
 * Devuelve el HTML de un <select> con todos los bancos RD.
 * - selectedId: id pre-seleccionado
 * - includeEmpty: si true, agrega una opción vacía al inicio
 */
export function bancosSelectOptions(selectedId = '', includeEmpty = true) {
  const grupos = {
    banco: 'Bancos múltiples',
    asociacion: 'Asociaciones de ahorros y préstamos',
    cooperativa: 'Cooperativas',
    otro: 'Otra',
  };
  let html = '';
  if (includeEmpty) html += `<option value="">— Selecciona —</option>`;
  for (const tipo of ['banco', 'asociacion', 'cooperativa', 'otro']) {
    const items = BANCOS_RD.filter((b) => b.tipo === tipo);
    if (!items.length) continue;
    html += `<optgroup label="${grupos[tipo]}">`;
    for (const b of items) {
      const sel = b.id === selectedId ? ' selected' : '';
      html += `<option value="${b.id}"${sel}>${escapeHtml(b.nombre)}</option>`;
    }
    html += `</optgroup>`;
  }
  return html;
}

/**
 * Renderiza un campo combinado: <select> de bancos + <input> de "otro" que
 * aparece solo cuando se selecciona "Otra entidad".
 *
 * @param {object} opts
 * @param {string} opts.selectId - id del <select>
 * @param {string} opts.otherInputId - id del <input> oculto/visible para nombre custom
 * @param {string} opts.label - etiqueta del campo
 * @param {string} opts.selectedBankId - banco preseleccionado (id de BANCOS_RD)
 * @param {string} opts.customName - nombre custom si selectedBankId === 'otro'
 * @param {boolean} opts.required
 */
export function bankFieldHtml({
  selectId = 'bank-select',
  otherInputId = 'bank-other',
  label = 'Banco / Entidad',
  selectedBankId = '',
  customName = '',
  required = false,
} = {}) {
  const showOther = selectedBankId === 'otro';
  return `
    <div class="form-group">
      <label class="form-label">${escapeHtml(label)}</label>
      <select id="${selectId}" class="form-select" ${required ? 'required' : ''} data-bank-other-target="${otherInputId}">
        ${bancosSelectOptions(selectedBankId)}
      </select>
    </div>
    <div class="form-group" id="${otherInputId}-wrap" style="${showOther ? '' : 'display:none'}">
      <label class="form-label">Nombre de la entidad</label>
      <input type="text" id="${otherInputId}" class="form-input" value="${escapeAttr(customName)}" placeholder="Escribe el nombre" ${showOther && required ? 'required' : ''} />
    </div>
  `;
}

/**
 * Conecta los listeners para que el input "Otra entidad" se muestre/oculte
 * cuando se selecciona "otro" en el <select>. Llamar después de insertar
 * el HTML al DOM.
 */
export function wireBankField(rootEl) {
  rootEl.querySelectorAll('select[data-bank-other-target]').forEach((sel) => {
    const targetId = sel.dataset.bankOtherTarget;
    const wrap = rootEl.querySelector(`#${targetId}-wrap`);
    const input = rootEl.querySelector(`#${targetId}`);
    if (!wrap) return;
    const sync = () => {
      const isOther = sel.value === 'otro';
      wrap.style.display = isOther ? '' : 'none';
      if (input) input.required = isOther && sel.required;
    };
    sel.addEventListener('change', sync);
    sync();
  });
}

/**
 * Lee un campo de banco renderizado por bankFieldHtml() y devuelve
 * { bankId, bankName } listos para guardar.
 */
export function readBankField(rootEl, selectId = 'bank-select', otherInputId = 'bank-other') {
  const sel = rootEl.querySelector(`#${selectId}`);
  const other = rootEl.querySelector(`#${otherInputId}`);
  const id = sel?.value || '';
  const customName = other?.value?.trim() || '';
  return {
    bankId: id,
    bankName: getBankName(id, customName),
  };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

export default { BANCOS_RD, getBankName, bancosSelectOptions, bankFieldHtml, wireBankField, readBankField };
