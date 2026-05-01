// ============================================
// Components — Reusable UI components
// ============================================
import { icon } from './icons.js';

// ---------- Toast Notifications ----------
let toastContainer = null;

export function showToast(type, title, message = '', duration = 4000) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const iconMap = { success: 'checkCircle', error: 'alert', warning: 'alert', info: 'info' };
  const toast = document.createElement('div');
  toast.className = 'toast toast-enter';
  toast.innerHTML = `
    <div class="toast-icon ${type}">${icon(iconMap[type] || 'info', 20)}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close">${icon('close', 16)}</button>
  `;
  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  toastContainer.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast.parentElement) return;
  toast.style.animation = 'fadeSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
  setTimeout(() => toast.remove(), 300);
}

// ---------- Modal ----------
export function openModal(title, contentHtml, options = {}) {
  const { width = '540px', onClose } = options;
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `
    <div class="modal-container" style="max-width:${width}">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" id="modal-close-btn">${icon('close', 20)}</button>
      </div>
      <div class="modal-body">${typeof contentHtml === 'string' ? contentHtml : ''}</div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  if (typeof contentHtml !== 'string' && contentHtml instanceof HTMLElement) {
    overlay.querySelector('.modal-body').appendChild(contentHtml);
  }
  overlay.querySelector('#modal-close-btn').onclick = () => {
    closeModal();
    if (onClose) onClose();
  };
  document.body.style.overflow = 'hidden';

  // Inject empty placeholders for floating labels system
  overlay.querySelectorAll('.form-input, .form-textarea').forEach(input => {
    if (!input.hasAttribute('placeholder')) {
      input.setAttribute('placeholder', ' ');
    }
  });

  // Focus first input
  setTimeout(() => {
    const input = overlay.querySelector('input, select, textarea');
    if (input) input.focus();
  }, 100);
  return overlay;
}

export function closeModal() {
  const modal = document.getElementById('active-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// ---------- Confirm Dialog ----------
export function confirmDialog(title, message, options = {}) {
  const { type = 'danger', confirmText = 'Confirmar', cancelText = 'Cancelar' } = options;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `
      <div class="modal-container" style="max-width:400px">
        <div class="confirm-body">
          <div class="confirm-icon ${type}">
            ${icon(type === 'danger' ? 'alert' : 'info', 28)}
          </div>
          <h3>${title}</h3>
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
          <button class="btn btn-${type}" id="confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('#confirm-cancel').onclick = () => { closeModal(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick = () => { closeModal(); resolve(true); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { closeModal(); resolve(false); } });
  });
}

// ---------- Empty State ----------
export function emptyState(iconName, title, desc, btnText, btnHandler) {
  const div = document.createElement('div');
  div.className = 'empty-state card';
  div.innerHTML = `
    ${icon(iconName, 64)}
    <h3>${title}</h3>
    <p>${desc}</p>
    ${btnText ? `<button class="btn btn-primary" id="empty-action">${icon('plus', 18)} ${btnText}</button>` : ''}
  `;
  if (btnText && btnHandler) {
    div.querySelector('#empty-action').onclick = btnHandler;
  }
  return div;
}

// ---------- Stat Card Builder ----------
export function buildStatCard(label, value, iconName, colorClass, change = null) {
  return `
    <div class="stat-card">
      <div class="stat-icon ${colorClass}">${icon(iconName, 24)}</div>
      <div class="stat-content">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        ${change !== null ? `<div class="stat-change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% vs mes anterior</div>` : ''}
      </div>
    </div>
  `;
}
