// ============================================
// Credit Assistant — Smart strategies for credit cards
// ============================================

import { getDaysUntil } from './utils.js';

export function analyzeCard(card) {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  const balance = parseFloat(card.saldoUsado) || 0;
  const limit = parseFloat(card.limiteCredito) || 1;
  const utilization = balance / limit;
  const interestRate = parseFloat(card.tasaInteres) || 0;

  let daysToCorte = null;
  let daysToPago = null;

  if (card.diaCorte) {
    daysToCorte = card.diaCorte >= currentDay ? card.diaCorte - currentDay : (daysInMonth - currentDay) + parseInt(card.diaCorte, 10);
  }

  if (card.diaPago) {
    daysToPago = card.diaPago >= currentDay ? card.diaPago - currentDay : (daysInMonth - currentDay) + parseInt(card.diaPago, 10);
  }

  const minPayment = balance * 0.05; // 5% minimum payment rule
  const idealPayment = balance; // Pay in full to avoid interest

  let riskLevel = 'low'; // low, medium, high
  let warnings = [];

  if (utilization > 0.8) {
    riskLevel = 'high';
    warnings.push('Alta utilización (uso de crédito supera el 80%). Afecta tu score.');
  }

  if (daysToPago !== null && daysToPago <= 3 && balance > 0) {
    riskLevel = 'high';
    warnings.push(`¡Peligro! Pago vence en ${daysToPago} días. Riesgo de recargos.`);
  } else if (daysToCorte !== null && daysToCorte <= 3 && balance > 0) {
    if (riskLevel === 'low') riskLevel = 'medium';
    warnings.push(`Corte en ${daysToCorte} días. Considera abonar antes para reportar menor deuda.`);
  }

  return {
    balance,
    minPayment,
    idealPayment,
    daysToCorte,
    daysToPago,
    riskLevel,
    warnings,
    interestRate,
    priorityScore: calculatePriorityScore(balance, interestRate, daysToPago, daysToCorte)
  };
}

function calculatePriorityScore(balance, interestRate, daysToPago, daysToCorte) {
  if (balance <= 0) return 0;
  let score = 0;
  
  // High interest cards get prioritized (Avalanche)
  if (interestRate > 0) {
    score += interestRate * 10;
  }
  
  // Close to due date gets extremely high priority
  if (daysToPago !== null) {
    score += (30 - daysToPago) * 2;
  }

  // Large balances get slight bumps to organize them
  score += Math.min(balance / 1000, 20);

  return score;
}

export function rankCardsByPriority(cards) {
  const analyzed = cards.filter(c => parseFloat(c.saldoUsado) > 0).map(c => {
    const analysis = analyzeCard(c);
    return { ...c, analysis };
  });

  analyzed.sort((a, b) => b.analysis.priorityScore - a.analysis.priorityScore);

  return analyzed;
}

export function getAssistantWidgetHTML(card, isExternal = false) {
  const analysis = analyzeCard(card);
  if (analysis.balance <= 0) return ''; // No recommendations needed if 0

  const badgeColor = analysis.riskLevel === 'high' ? 'var(--color-danger)' : analysis.riskLevel === 'medium' ? 'var(--color-warning)' : 'var(--color-info)';
  
  return `
    <div style="background:var(--bg-secondary);border-left:3px solid ${badgeColor};padding:10px;border-radius:6px;margin:12px 0 0 0;font-size:0.85rem">
      <div style="display:flex;align-items:center;margin-bottom:6px;font-weight:600;color:var(--text-accent)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Asistente Financiero
      </div>
      ${analysis.warnings.length > 0 ? `<div style="color:${badgeColor};margin-bottom:8px;font-weight:500">${analysis.warnings.join('<br>')}</div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:var(--text-secondary)">Pago Mínimo Sugerido:</span>
        <span style="font-weight:600">$${analysis.minPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:var(--text-secondary)">Pago Ideal (Sin intereses):</span>
        <span style="color:var(--color-income);font-weight:600">$${analysis.idealPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
      </div>
    </div>
  `;
}
