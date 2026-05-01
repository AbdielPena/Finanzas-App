// ============================================
// Notifications — Internal notification system
// ============================================
import store from './store.js';
import { generateId, formatDate, getDaysUntil } from './utils.js';

export function addNotification(tipo, titulo, mensaje, moduloOrigen = '', referenciaId = '', fechaVencimiento = null) {
  store.add('notifications', {
    id: generateId(),
    tipo,
    titulo,
    mensaje,
    moduloOrigen,
    referenciaId,
    leida: false,
    fechaVencimiento,
  });
}

export function getNotifications(unreadOnly = false) {
  let notifs = store.getAll('notifications');
  if (unreadOnly) notifs = notifs.filter(n => !n.leida);
  return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadCount() {
  return store.count('notifications', n => !n.leida);
}

export function markAsRead(id) {
  store.update('notifications', id, { leida: true });
}

export function markAllAsRead() {
  const notifs = store.getAll('notifications');
  notifs.forEach(n => n.leida = true);
  store.save('notifications', notifs);
}

export function deleteNotification(id) {
  store.remove('notifications', id);
}

export function clearAllNotifications() {
  store.save('notifications', []);
}

// Generate alerts based on the current state
export function generateAlerts() {
  // Subscriptions due + Auto Queue the charge
  const subs = store.getAll('subscriptions').filter(s => s.activa && s.estado === 'activa');
  subs.forEach(sub => {
    if (sub.proximoCobro) {
      const days = getDaysUntil(sub.proximoCobro);
      // Notificar cercanía
      if (days >= 0 && days <= 3) {
        const existing = store.find('notifications', n => n.moduloOrigen === 'subscriptions' && n.referenciaId === sub.id && !n.leida);
        if (!existing) {
          addNotification('advertencia', `Cobro próximo: ${sub.nombre}`, `Se cobra en ${days === 0 ? 'hoy' : days + ' días'} — ${formatMoney(sub.monto)}`, 'subscriptions', sub.id, sub.proximoCobro);
        }
      }
      
      // Auto-Generar el Cobro Pendiente si llegó la fecha (días <= 0)
      if (days <= 0) {
        const existingCharge = store.find('subscription_charges', c => c.suscripcionId === sub.id && c.fechaProgramada === sub.proximoCobro);
        if (!existingCharge) {
          store.add('subscription_charges', {
            id: generateId(),
            suscripcionId: sub.id,
            fechaProgramada: sub.proximoCobro,
            fechaConfirmada: null,
            confirmado: false,
            monto: sub.monto,
          });
          // Forzar la creación de la notificación para que la vea en la campanita
          addNotification('alerta', `Cobro generado de ${sub.nombre}`, `Pulsa para confirmar el descuento por ${formatMoney(sub.monto)}`, 'subscriptions', sub.id + '_charge');
        }
      }
    }
  });

  // Receivables overdue
  const receivables = store.getAll('receivables').filter(r => r.estado !== 'cobrada');
  receivables.forEach(r => {
    const days = getDaysUntil(r.fechaLimite);
    if (days < 0) {
      const existing = store.find('notifications', n =>
        n.moduloOrigen === 'receivables' && n.referenciaId === r.id && !n.leida
      );
      if (!existing) {
        addNotification('alerta', `Vencida: ${r.deudor}`,
          `La cuenta por cobrar venció el ${formatDate(r.fechaLimite)}`,
          'receivables', r.id);
      }
    }
  });

  // Payables due soon
  const payables = store.getAll('payables').filter(p => p.estado !== 'pagada');
  payables.forEach(p => {
    const days = getDaysUntil(p.fechaLimite);
    if (days >= 0 && days <= 5) {
      const existing = store.find('notifications', n =>
        n.moduloOrigen === 'payables' && n.referenciaId === p.id && !n.leida
      );
      if (!existing) {
        addNotification('advertencia', `Pago próximo: ${p.beneficiario}`,
          `Vence en ${days === 0 ? 'hoy' : days + ' días'}`,
          'payables', p.id, p.fechaLimite);
      }
    }
  });

  // Credit card alerts (>80% used and Upcoming Payment/Cut)
  const cards = store.getAll('cards').filter(c => c.activa);
  const now = new Date();
  const currDay = now.getDate();
  const currMonth = now.getMonth();
  const currYear = now.getFullYear();
  const daysInMonth = new Date(currYear, currMonth + 1, 0).getDate();

  cards.forEach(card => {
    // 1. Uso de límite
    const usage = (card.saldoUsado / card.limiteCredito) * 100;
    if (usage >= 80) {
      const existing = store.find('notifications', n => n.moduloOrigen === 'cards' && n.referenciaId === card.id + '_usage' && !n.leida);
      if (!existing) {
        addNotification('alerta', `Tarjeta al ${Math.round(usage)}%: ${card.nombre}`, `Has usado ${Math.round(usage)}% del límite de crédito`, 'cards', card.id + '_usage');
      }
    }

    // 2. Fecha de Pago (Avisar 3 días antes)
    if (card.diaPago) {
      const remainingPago = card.diaPago >= currDay ? card.diaPago - currDay : (daysInMonth - currDay) + card.diaPago;
      if (remainingPago >= 0 && remainingPago <= 3) {
        const existingPago = store.find('notifications', n => n.moduloOrigen === 'cards' && n.referenciaId === card.id + '_pago' && !n.leida);
        if (!existingPago) {
          addNotification('advertencia', `Pago de Tarjeta Próximo`, `El límite de pago de tu ${card.nombre} es en ${remainingPago === 0 ? 'hoy' : remainingPago + ' día(s)'}`, 'cards', card.id + '_pago');
        }
      }
    }

    // 3. Fecha de Corte (Avisar 2 días antes o el mismo día)
    if (card.diaCorte) {
      const remainingCorte = card.diaCorte >= currDay ? card.diaCorte - currDay : (daysInMonth - currDay) + card.diaCorte;
      if (remainingCorte >= 0 && remainingCorte <= 2) {
        const existingCorte = store.find('notifications', n => n.moduloOrigen === 'cards' && n.referenciaId === card.id + '_corte' && !n.leida);
        if (!existingCorte) {
          addNotification('info', `Corte de Tarjeta`, `Tu ${card.nombre} hace corte ${remainingCorte === 0 ? 'hoy' : 'en ' + remainingCorte + ' día(s)'}`, 'cards', card.id + '_corte');
        }
      }
    }
  });
}
