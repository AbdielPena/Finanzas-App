// ============================================
// Notes Page — Financial notes & reminders
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { generateId, formatDate } from '../utils.js';
import { openModal, closeModal, showToast, confirmDialog, emptyState } from '../components.js';

const NOTE_COLORS = ['#334155', '#7f1d1d', '#78350f', '#064e3b', '#1e3a8a', '#4c1d95', '#701a75'];

function noteForm(note = null) {
  return `
    <form id="note-form">
      <div class="form-group">
        <label class="form-label">Título</label>
        <input type="text" class="form-input" id="note-title" value="${note?.titulo || ''}" placeholder="Ej: Ideas de inversión, Compras pendientes..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Contenido</label>
        <textarea class="form-textarea" id="note-content" rows="6" placeholder="Escribe tu nota aquí..." required>${note?.contenido || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Color de fondo</label>
        <div class="color-picker-group" id="note-color-picker">
          ${NOTE_COLORS.map(c => `
            <div class="color-option ${note?.color === c || (!note && c === NOTE_COLORS[0]) ? 'selected' : ''}" 
                 data-color="${c}" style="background:${c}"></div>
          `).join('')}
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="note-pinned" ${note?.fijada ? 'checked' : ''} />
        <label for="note-pinned" style="font-size:0.9rem;cursor:pointer">Fijar al principio</label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check', 18)} ${note ? 'Guardar' : 'Crear'}</button>
      </div>
    </form>
  `;
}

export default function renderNotes() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    let notes = store.getAll('notes');
    
    if (notes.length === 0) {
      page.innerHTML = '';
      page.appendChild(emptyState('fileText', 'Sin notas', 'Usa este espacio para apuntar recordatorios, ideas de inversión o pendientes.', 'Crear Nota', () => openNoteModal()));
      return;
    }

    // Sort: Pinned first, then by date descending
    notes.sort((a, b) => {
      if (a.fijada && !b.fijada) return -1;
      if (!a.fijada && b.fijada) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Notas</h1>
          <p>${notes.length} nota${notes.length !== 1 ? 's' : ''} guardada${notes.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-note-btn">${icon('plus', 18)} Nueva Nota</button>
        </div>
      </div>

      <div class="grid grid-auto stagger-children" style="align-items:start">
        ${notes.map(note => `
          <div class="card" style="background:${note.color || NOTE_COLORS[0]}; posición:relative; border: 1px solid rgba(255,255,255,0.1)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
                ${note.fijada ? icon('star', 16, 'var(--color-warning)') : ''}
                ${note.titulo}
              </h3>
              <div style="display:flex;gap:4px">
                <button class="btn-icon" data-edit-note="${note.id}" style="color:rgba(255,255,255,0.7);width:28px;height:28px">${icon('edit', 14)}</button>
                <button class="btn-icon" data-del-note="${note.id}" style="color:rgba(255,255,255,0.7);width:28px;height:28px">${icon('trash', 14)}</button>
              </div>
            </div>
            <div style="font-size:0.9rem;line-height:1.5;white-space:pre-wrap;color:rgba(255,255,255,0.9);margin-bottom:16px">${note.contenido}</div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.5)">Actualizado: ${formatDate(note.updatedAt || note.createdAt)}</div>
          </div>
        `).join('')}
      </div>
    `;

    page.querySelector('#add-note-btn')?.addEventListener('click', () => openNoteModal());
    page.querySelectorAll('[data-edit-note]').forEach(btn => btn.addEventListener('click', () => {
      const note = store.getById('notes', btn.dataset.editNote);
      if (note) openNoteModal(note);
    }));
    page.querySelectorAll('[data-del-note]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Eliminar nota?', 'Esta acción no se puede deshacer.');
      if (ok) {
        store.remove('notes', btn.dataset.delNote);
        showToast('success', 'Nota eliminada');
        render();
      }
    }));
  };

  function openNoteModal(note = null) {
    const modal = openModal(note ? 'Editar Nota' : 'Nueva Nota', noteForm(note));
    
    // Color picker
    modal.querySelectorAll('#note-color-picker .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('#note-color-picker .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    modal.querySelector('#note-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedColor = modal.querySelector('#note-color-picker .selected')?.dataset.color || NOTE_COLORS[0];
      const data = {
        titulo: modal.querySelector('#note-title').value.trim(),
        contenido: modal.querySelector('#note-content').value.trim(),
        color: selectedColor,
        fijada: modal.querySelector('#note-pinned').checked,
        updatedAt: new Date().toISOString()
      };

      if (note) {
        store.update('notes', note.id, data);
        showToast('success', 'Nota actualizada');
      } else {
        store.add('notes', { ...data, id: generateId(), createdAt: new Date().toISOString() });
        showToast('success', 'Nota guardada');
      }
      closeModal();
      render();
    });
  }

  render();
  return page;
}
