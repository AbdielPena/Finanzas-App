// ============================================
// Notifications Page — Internal alerts center
// ============================================
import { icon } from '../icons.js';
import { formatRelativeDate } from '../utils.js';
import { showToast, confirmDialog } from '../components.js';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } from '../notifications.js';

export default function renderNotifications() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const notifs = getNotifications();
    const unread = notifs.filter(n => !n.leida).length;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Notificaciones</h1>
          <p>${unread} sin leer de ${notifs.length} total</p>
        </div>
        <div class="page-header-actions">
          ${unread > 0 ? `<button class="btn btn-secondary" id="mark-all-read">${icon('check', 18)} Marcar todo como leído</button>` : ''}
          ${notifs.length > 0 ? `<button class="btn btn-ghost" id="clear-all">${icon('trash', 18)} Limpiar</button>` : ''}
        </div>
      </div>

      ${notifs.length > 0 ? `
        <div class="stagger-children">
          ${notifs.map(n => {
            const iconMap = { alerta: 'alert', advertencia: 'alert', info: 'info', exito: 'checkCircle' };
            const colorMap = { alerta: 'expense', advertencia: 'warning', info: 'info', exito: 'income' };
            return `
              <div class="card" style="margin-bottom:8px;${!n.leida ? 'border-left:3px solid var(--accent-primary)' : 'opacity:0.6'}">
                <div style="display:flex;align-items:flex-start;gap:14px">
                  <div class="stat-icon ${colorMap[n.tipo] || 'info'}" style="width:40px;height:40px;flex-shrink:0">
                    ${icon(iconMap[n.tipo] || 'info', 20)}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                      <div>
                        <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px">${n.titulo}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary)">${n.mensaje}</div>
                      </div>
                      <div style="display:flex;gap:4px;flex-shrink:0;margin-left:12px">
                        ${!n.leida ? `<button class="btn-icon" data-read="${n.id}" title="Marcar como leída">${icon('check', 16)}</button>` : ''}
                        <button class="btn-icon" data-del-notif="${n.id}" title="Eliminar">${icon('close', 16)}</button>
                      </div>
                    </div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">${formatRelativeDate(n.createdAt)}</div>
                    ${n.moduloOrigen ? `
                      <div style="margin-top:8px">
                        <button class="btn btn-secondary btn-sm" onclick="location.hash='#/${n.moduloOrigen}'">${icon('externalLink', 14)} Revisar evento</button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state card">
          ${icon('notification', 64)}
          <h3>Sin notificaciones</h3>
          <p>Las alertas de pagos, vencimientos y metas aparecerán aquí</p>
        </div>
      `}
    `;

    page.querySelector('#mark-all-read')?.addEventListener('click', () => { markAllAsRead(); showToast('info', 'Todas marcadas como leídas'); render(); updateNotifBadge(); });
    page.querySelector('#clear-all')?.addEventListener('click', async () => {
      const ok = await confirmDialog('¿Limpiar todas?', 'Se eliminarán todas las notificaciones.');
      if (ok) { clearAllNotifications(); showToast('info', 'Notificaciones limpiadas'); render(); updateNotifBadge(); }
    });
    page.querySelectorAll('[data-read]').forEach(btn => btn.addEventListener('click', () => { markAsRead(btn.dataset.read); render(); updateNotifBadge(); }));
    page.querySelectorAll('[data-del-notif]').forEach(btn => btn.addEventListener('click', () => { deleteNotification(btn.dataset.delNotif); render(); updateNotifBadge(); }));
  };

  render();
  return page;
}

export function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const count = getNotifications(true).length;
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
