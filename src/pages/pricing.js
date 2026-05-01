// ============================================
// Pricing Page — Comparación de planes para el usuario final
// Muestra catálogo de planes activos, highlighta el actual,
// permite solicitar upgrade.
// ============================================

import {
  ensureSeeded, getActivePlans, getCurrentPlan, getCurrentAssignment,
  assignPlanToUser, FEATURE_CATEGORIES, getPlanSummary,
} from '../plans_engine.js';
import { getCurrentUser } from '../auth.js';
import { icon } from '../icons.js';
import { showToast, confirmDialog } from '../components.js';
import { formatDate } from '../utils.js';

export default function renderPricing() {
  ensureSeeded();
  const user = getCurrentUser();
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const render = () => {
    const plans = getActivePlans();
    const current = getCurrentPlan();
    const assignment = getCurrentAssignment();
    const summary = getPlanSummary();

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Planes</h1>
          <p>Elige el plan que mejor se adapte a cómo gestionas tu dinero.</p>
        </div>
      </div>

      ${renderCurrentPlanCard(current, assignment, summary)}

      <div class="pricing-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:26px">
        ${plans.map(p => renderPricingCard(p, current)).join('')}
      </div>

      ${renderFeatureMatrix(plans, current)}
    `;

    bindEvents();
  };

  const renderCurrentPlanCard = (plan, assignment, summary) => {
    const criticalList = summary.usage.filter(u => u.critical).slice(0, 4);
    return `
      <div class="card" style="padding:22px;background:linear-gradient(135deg, var(--accent-soft) 0%, transparent 70%);border:1px solid var(--border);border-left:4px solid ${plan.color || 'var(--accent)'}">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-2);font-weight:700">Plan actual</div>
            <h2 style="font-family:var(--f-heading);font-size:1.6rem;margin-top:4px">${plan.name}</h2>
            ${assignment ? `
              <div style="margin-top:4px;font-size:0.82rem;color:var(--text-2)">
                Estado: <span class="badge badge-${assignment.status === 'active' ? 'success' : 'warning'}">${assignment.status}</span>
                ${assignment.endDate ? ` · Vence ${formatDate(assignment.endDate)}` : ''}
              </div>
            ` : `<div style="margin-top:4px;font-size:0.82rem;color:var(--text-2)">Acceso compatible (heredado)</div>`}
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--f-heading);font-size:2rem;font-weight:700;color:${plan.color || 'var(--accent)'}">
              ${plan.price === 0 ? 'Gratis' : `${plan.currency} ${plan.price}`}
            </div>
            <div style="font-size:0.78rem;color:var(--text-2)">${plan.billing === 'annual' ? 'por año' : plan.billing === 'once' ? 'pago único' : 'por mes'}</div>
          </div>
        </div>

        ${criticalList.length > 0 ? `
          <div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--border)">
            <div style="font-size:0.78rem;font-weight:600;color:var(--warn);margin-bottom:8px">⚠️ Cerca del límite</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
              ${criticalList.map(u => `
                <div style="background:var(--bg-2);padding:10px 12px;border-radius:var(--r-md)">
                  <div style="font-size:0.78rem;color:var(--text-1);font-weight:600">${u.label}</div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                    <span style="font-size:0.82rem;font-variant-numeric:tabular-nums">${u.current}/${u.limit}</span>
                    <span style="font-size:0.72rem;font-weight:600;color:${u.percent >= 100 ? 'var(--bad)' : 'var(--warn)'}">${u.percent}%</span>
                  </div>
                  <div style="height:4px;background:var(--bg-3);border-radius:4px;overflow:hidden;margin-top:6px">
                    <div style="height:100%;width:${Math.min(100, u.percent)}%;background:${u.percent >= 100 ? 'var(--bad)' : 'var(--warn)'}"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  };

  const renderPricingCard = (p, current) => {
    const isCurrent = p.id === current.id;
    const featured = p.featured;
    const topFeatures = getTopFeatures(p);
    return `
      <div class="pricing-card ${featured ? 'featured' : ''} ${isCurrent ? 'current' : ''}" style="
        background:var(--bg-1);
        border:${featured ? `2px solid ${p.color}` : '1px solid var(--border)'};
        border-radius:var(--r-xl);
        padding:26px 22px;
        position:relative;
        transition:all var(--t-smooth);
        ${featured ? `box-shadow:0 18px 38px ${p.color}22, 0 4px 12px rgba(0,0,0,0.08)` : ''}
      ">
        ${featured ? `<div style="position:absolute;top:-10px;right:16px;background:${p.color};color:#fff;padding:4px 10px;border-radius:999px;font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${p.tagline || 'Popular'}</div>` : ''}
        ${isCurrent ? `<div style="position:absolute;top:16px;left:16px;background:var(--ok-soft);color:var(--ok);padding:4px 10px;border-radius:999px;font-size:0.66rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Plan actual</div>` : ''}

        <div style="margin-top:${isCurrent || featured ? '18px' : '0'}">
          <div style="font-family:var(--f-heading);font-size:1.35rem;font-weight:700;color:${p.color}">${p.name}</div>
          <p style="color:var(--text-2);font-size:0.85rem;margin-top:6px;min-height:40px">${p.description || ''}</p>
        </div>

        <div style="margin:18px 0 14px;padding:14px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:baseline;gap:6px">
            <span style="font-family:var(--f-heading);font-size:2.2rem;font-weight:800;color:var(--text-0)">${p.price === 0 ? '0' : p.price}</span>
            <span style="color:var(--text-2);font-size:0.9rem">${p.currency}</span>
            <span style="color:var(--text-2);font-size:0.82rem;margin-left:auto">${p.billing === 'annual' ? '/año' : p.billing === 'once' ? 'único' : '/mes'}</span>
          </div>
        </div>

        <ul style="list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:8px">
          ${topFeatures.map(f => `
            <li style="display:flex;gap:8px;align-items:flex-start;font-size:0.85rem">
              <span style="color:${p.color};flex-shrink:0;margin-top:2px">${icon('check', 14)}</span>
              <span style="color:var(--text-1)">${f}</span>
            </li>
          `).join('')}
        </ul>

        ${isCurrent
          ? `<button class="btn btn-ghost" style="width:100%" disabled>Plan actual</button>`
          : `<button class="btn ${featured ? 'btn-primary' : 'btn-ghost'}" data-action="select-plan" data-plan="${p.id}" style="width:100%">${p.cta || `Cambiar a ${p.name}`}</button>`
        }
      </div>
    `;
  };

  const renderFeatureMatrix = (plans, current) => {
    return `
      <div style="margin-top:40px">
        <h2 style="font-family:var(--f-heading);font-size:1.3rem;margin-bottom:16px">Comparación detallada</h2>
        <div class="card" style="padding:0;overflow:auto">
          <table class="data-table pricing-matrix" style="min-width:720px">
            <thead>
              <tr>
                <th style="text-align:left;min-width:200px">Funcionalidad</th>
                ${plans.map(p => `<th style="text-align:center;color:${p.color}">${p.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.values(FEATURE_CATEGORIES).map(cat => `
                <tr class="category-row">
                  <td colspan="${plans.length + 1}" style="background:var(--bg-2);font-weight:700;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-1)">
                    ${cat.name}
                  </td>
                </tr>
                ${(cat.limits || []).map(lim => `
                  <tr>
                    <td style="color:var(--text-1)">${lim.label}</td>
                    ${plans.map(p => {
                      const v = p.limits?.[lim.key];
                      if (v === -1) return `<td style="text-align:center;color:var(--ok);font-weight:700">∞</td>`;
                      if (v === 0 || v === undefined) return `<td style="text-align:center;color:var(--text-3)">—</td>`;
                      return `<td style="text-align:center;font-variant-numeric:tabular-nums">${v}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
                ${(cat.features || []).map(fk => `
                  <tr>
                    <td style="color:var(--text-1)">${humanizeFeature(fk)}</td>
                    ${plans.map(p => {
                      const has = p.features?.[fk];
                      return `<td style="text-align:center">${has ? `<span style="color:var(--ok)">${iconSafe('check')}</span>` : `<span style="color:var(--text-3)">—</span>`}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const bindEvents = () => {
    page.querySelectorAll('[data-action="select-plan"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const planId = btn.dataset.plan;
        const ok = await confirmDialog(
          '¿Cambiar de plan?',
          'Tu data actual se preserva. Si bajas de plan, solo se limitarán nuevas creaciones a partir de ahora.'
        );
        if (!ok) return;
        if (!user?.id) {
          showToast('warning', 'Usuario no identificado', 'Inicia sesión para cambiar de plan.');
          return;
        }
        assignPlanToUser(user.id, planId, { status: 'active' });
        showToast('success', 'Plan actualizado', 'Tu plan se aplicará inmediatamente.');
        render();
      });
    });
  };

  render();
  return page;
}

// --- Helpers ---
function getTopFeatures(p) {
  const out = [];
  const l = p.limits || {};
  if (l.max_accounts === -1) out.push('Cuentas ilimitadas');
  else if (l.max_accounts > 0) out.push(`Hasta ${l.max_accounts} cuentas`);

  if (l.max_transactions_month === -1) out.push('Transacciones ilimitadas');
  else if (l.max_transactions_month > 0) out.push(`${l.max_transactions_month} transacciones/mes`);

  if (l.max_clients === -1) out.push('Clientes ilimitados');
  else if (l.max_clients > 0) out.push(`${l.max_clients} clientes`);

  if (l.max_ai_queries_month === -1) out.push('IA ilimitada');
  else if (l.max_ai_queries_month > 0) out.push(`${l.max_ai_queries_month} consultas IA/mes`);

  const f = p.features || {};
  if (f.advanced_reports) out.push('Reportes avanzados');
  if (f.export_excel) out.push('Export a Excel');
  if (f.auto_backup) out.push('Respaldo automático');
  if (f.priority_support) out.push('Soporte prioritario');
  if (f.bank_sync) out.push('Sincronización bancaria');
  if (f.api_access) out.push('Acceso API');
  if (f.white_label) out.push('White-label');

  return out.slice(0, 7);
}

function humanizeFeature(key) {
  const map = {
    ai_chat: 'Chat con IA',
    ai_categorization: 'Categorización IA',
    ai_insights: 'Insights con IA',
    advanced_reports: 'Reportes avanzados',
    custom_dashboards: 'Dashboards personalizados',
    historical_analytics: 'Analytics histórico',
    export_pdf: 'Exportar a PDF',
    export_excel: 'Exportar a Excel',
    import_csv: 'Importar CSV',
    auto_backup: 'Respaldo automático',
    bank_sync: 'Sincronización bancaria',
    webhooks: 'Webhooks',
    api_access: 'Acceso API',
    zapier: 'Integración Zapier',
    custom_categories_unlimited: 'Categorías ilimitadas',
    custom_themes: 'Temas personalizados',
    white_label: 'White-label',
    priority_support: 'Soporte prioritario',
    dedicated_manager: 'Account manager dedicado',
  };
  return map[key] || key.replace(/_/g, ' ');
}

function iconSafe(name) {
  try { return icon(name, 14); } catch { return '✓'; }
}
