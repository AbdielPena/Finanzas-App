// ============================================
// Categories Page — Manage custom categories
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog } from '../components.js';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../categories.js';

const CAT_COLORS = ['#ff7043','#42a5f5','#66bb6a','#ab47bc','#ffa726','#ec407a','#26a69a','#5c6bc0','#8d6e63','#78909c','#ef5350','#00bcd4'];
const CAT_EMOJIS = ['💰','💳','🍔','🚗','🏠','🏥','📚','🎮','👕','📱','🔄','📦','💻','✈️','🎁','🧴','📋','❤️','⚡','🎬','🛒','☕','🍕','🎵'];

function catForm(cat = null) {
  return `
    <form id="cat-form">
      <div class="form-group">
        <label class="form-label">Nombre <span class="required">*</span></label>
        <input type="text" class="form-input" id="cat-name" value="${cat?.nombre || ''}" placeholder="Nombre de la categoría" required />
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="cat-type">
          <option value="gasto" ${cat?.tipo === 'gasto' ? 'selected' : ''}>Gasto</option>
          <option value="ingreso" ${cat?.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
          <option value="ambos" ${cat?.tipo === 'ambos' ? 'selected' : ''}>Ambos</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Icono</label>
        <div class="color-picker-group" id="cat-emoji-picker" style="gap:4px">
          ${CAT_EMOJIS.map(e => `<div class="color-option ${(cat?.emoji || cat?.icono) === e ? 'selected' : ''}" data-emoji="${e}" style="background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.1rem;border-radius:6px;width:36px;height:36px">${e}</div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="cat-color-picker">
          ${CAT_COLORS.map(c => `<div class="color-option ${cat?.color === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${cat ? 'Guardar' : 'Crear'}</button>
      </div>
    </form>
  `;
}

export default function renderCategories() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const cats = getCategories();
    const incCats = cats.filter(c => c.tipo === 'ingreso');
    const expCats = cats.filter(c => c.tipo === 'gasto');
    const bothCats = cats.filter(c => c.tipo === 'ambos');

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Categorías</h1>
          <p>${cats.length} categorías (${cats.filter(c => c.esSistema).length} del sistema, ${cats.filter(c => !c.esSistema).length} personalizadas)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-cat-btn">${icon('plus', 18)} Nueva Categoría</button>
        </div>
      </div>

      ${_renderSection('Ingresos', incCats)}
      ${_renderSection('Gastos', expCats)}
      ${_renderSection('Ambos', bothCats)}
    `;

    page.querySelector('#add-cat-btn').addEventListener('click', () => openCatModal());
    page.querySelectorAll('[data-edit-cat]').forEach(btn => btn.addEventListener('click', () => {
      const cat = store.getById('categories', btn.dataset.editCat);
      if (cat) openCatModal(cat);
    }));
    page.querySelectorAll('[data-del-cat]').forEach(btn => btn.addEventListener('click', async () => {
      const cat = store.getById('categories', btn.dataset.delCat);
      if (cat?.esSistema) { showToast('warning', 'No se puede eliminar', 'Las categorías del sistema no pueden ser eliminadas'); return; }
      const ok = await confirmDialog('¿Eliminar categoría?', `"${cat?.nombre}" será eliminada.`);
      if (ok) { deleteCategory(btn.dataset.delCat); showToast('success', 'Categoría eliminada'); render(); }
    }));
  };

  function _renderSection(title, cats) {
    if (cats.length === 0) return '';
    return `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>${title}</h3></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${cats.map(c => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg-input);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
              <span style="font-size:1.2rem">${c.emoji || c.icono || ''}</span>
              <span style="font-size:0.85rem;font-weight:500">${c.nombre || ''}</span>
              <span style="width:10px;height:10px;border-radius:50%;background:${c.color}"></span>
              ${c.esSistema ? '<span class="badge badge-neutral" style="font-size:0.6rem">Sistema</span>' : `
                <button class="btn-icon" data-edit-cat="${c.id}" style="width:24px;height:24px">${icon('edit', 12)}</button>
                <button class="btn-icon" data-del-cat="${c.id}" style="width:24px;height:24px">${icon('trash', 12)}</button>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function openCatModal(cat = null) {
    if (cat?.esSistema) { showToast('warning', 'Las categorías del sistema no pueden ser editadas'); return; }
    const modal = openModal(cat ? 'Editar Categoría' : 'Nueva Categoría', catForm(cat));
    modal.querySelectorAll('#cat-emoji-picker .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('#cat-emoji-picker .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    modal.querySelectorAll('#cat-color-picker .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('#cat-color-picker .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    modal.querySelector('#cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedEmoji = modal.querySelector('#cat-emoji-picker .selected');
      const selectedColor = modal.querySelector('#cat-color-picker .selected');
      const data = {
        nombre: modal.querySelector('#cat-name').value.trim(),
        tipo: modal.querySelector('#cat-type').value,
        emoji: selectedEmoji?.dataset.emoji || '📦',
        color: selectedColor?.dataset.color || '#bdbdbd',
      };
      if (cat) { updateCategory(cat.id, data); showToast('success', 'Categoría actualizada'); }
      else { addCategory(data); showToast('success', 'Categoría creada'); }
      closeModal(); render();
    });
  }

  render();
  return page;
}
