// ============================================
// Dashboard Page — Visión financiera (Mercury/Ramp-inspired minimal fintech)
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { formatMoney, getCurrentMonth, getMonthName, animateValue } from '../utils.js';
import { getCategoryById } from '../categories.js';
import { getUnreadCount } from '../notifications.js';
import { getLoanCommitmentsTotal } from '../loans_engine.js';
import { calcAccountBalance, getTotalPatrimony } from '../balance_engine.js';

function getMonthTransactions(period) {
  return store.filter('transactions', t => t.fecha && t.fecha.startsWith(period));
}

// Mini sparkline en SVG: genera path suave desde un array de valores
function miniSparkline(values, w = 120, h = 32, color = 'currentColor') {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`);
  // Área bajo la curva
  const areaPts = [`0,${h}`, ...pts, `${w},${h}`].join(' ');
  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" class="spark-svg">
      <polygon fill="${color}" fill-opacity="0.08" points="${areaPts}"/>
      <polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}"/>
    </svg>`;
}

// Formatea un número en partes: currency + entero + decimales
function splitMoneyParts(n) {
  const safe = Number(n) || 0;
  const sign = safe < 0 ? '−' : '';
  const abs = Math.abs(safe);
  const intPart = Math.floor(abs).toLocaleString('en-US');
  const decPart = (abs - Math.floor(abs)).toFixed(2).slice(2);
  return { sign, currency: 'RD$', int: intPart, dec: decPart };
}

export default function renderDashboard() {
  const page = document.createElement('div');
  page.className = 'page-content animate';

  const currentMonth = getCurrentMonth();
  const prevMonth = (() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const monthTxs = getMonthTransactions(currentMonth);
  const prevMonthTxs = getMonthTransactions(prevMonth);

  const incomeMonth = monthTxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
  const expenseMonth = monthTxs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
  const incomePrev = prevMonthTxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
  const expensePrev = prevMonthTxs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);

  const deltaIncome = incomePrev > 0 ? ((incomeMonth - incomePrev) / incomePrev) * 100 : 0;
  const deltaExpense = expensePrev > 0 ? ((expenseMonth - expensePrev) / expensePrev) * 100 : 0;
  const netMonth = incomeMonth - expenseMonth;
  const netPrev = incomePrev - expensePrev;
  const deltaNet = Math.abs(netPrev) > 0 ? ((netMonth - netPrev) / Math.abs(netPrev)) * 100 : 0;

  // Estado patrimonial
  const activeAccounts = store.getAll('accounts').filter(a => a.activa !== false);
  const activeCards = store.getAll('cards').filter(c => c.activa !== false);

  const sumAccounts = activeAccounts.reduce((sum, acc) => sum + calcAccountBalance(acc.id), 0);
  const sumReceivables = store.getAll('receivables').filter(r => r.estado !== 'pagada').reduce((s, r) => s + (parseFloat(r.saldoPendiente) || 0), 0);
  const totalActivos = sumAccounts + sumReceivables;

  const sumCards = activeCards.reduce((sum, c) => sum + (parseFloat(c.saldoUsado) || 0), 0);
  const sumDebts = store.getAll('debts')
    .filter(d => d && d.estado !== 'pagada' && !d.paid)
    .reduce((s, d) => s + (parseFloat(d.saldoPendiente) || parseFloat(d.montoTotal) || parseFloat(d.amount) || 0), 0);
  const sumPayables = store.getAll('payables')
    .filter(p => p && p.estado !== 'pagada')
    .reduce((s, p) => s + ((parseFloat(p.monto) || 0) - (parseFloat(p.montoPagado) || 0)), 0);

  const loans = store.getAll('loans');
  const sumLoanCommitments = getLoanCommitmentsTotal(loans);
  const totalPasivos = sumCards + sumDebts + sumPayables + sumLoanCommitments;
  const patrimonioNeto = totalActivos - totalPasivos;

  // Salud financiera (tasa de ahorro del mes)
  const tasaAhorro = incomeMonth > 0 ? Math.max(0, Math.min(100, ((incomeMonth - expenseMonth) / incomeMonth) * 100)) : 0;
  const scoreFinanciero = Math.min(100, Math.round(
    (tasaAhorro * 0.45) +
    (Math.max(0, 100 - (totalPasivos / Math.max(totalActivos, 1)) * 100) * 0.35) +
    (Math.min(100, activeAccounts.length * 25) * 0.2)
  ));

  // Notificaciones y pendientes
  const pendingSubs = store.filter('subscription_charges', c => !c.confirmado).length;
  const unreadNotifs = getUnreadCount();
  const overduePayables = store.filter('payables', p => {
    if (!p || p.estado === 'pagada') return false;
    if (!p.fechaVencimiento) return false;
    return new Date(p.fechaVencimiento) < new Date();
  }).length;

  // 10% / diezmo
  const incomeBase10 = store.filter('transactions', t =>
    (t.aplicaDiezmo === true || t.categoriaId === 'cat_salary' || (t.aplicaDiezmo === undefined && t.tipo === 'ingreso'))
    && t.fecha && t.fecha.startsWith(currentMonth)
  ).reduce((s, t) => s + (parseFloat(t.monto) || 0), 0);
  const titheAmount = incomeBase10 * 0.1;

  // Gastos por categoría
  const expenseByCategory = {};
  monthTxs.filter(t => t.tipo === 'gasto').forEach(t => {
    const catId = t.categoriaId || 'cat_other_expense';
    expenseByCategory[catId] = (expenseByCategory[catId] || 0) + (parseFloat(t.monto) || 0);
  });
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Serie diaria del mes
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyIncome = Array(daysInMonth).fill(0);
  const dailyExpense = Array(daysInMonth).fill(0);
  const dailyNet = Array(daysInMonth).fill(0);
  const labelsDay = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  monthTxs.forEach(t => {
    if (!t.fecha) return;
    const day = parseInt(t.fecha.split('-')[2], 10);
    if (day >= 1 && day <= daysInMonth) {
      if (t.tipo === 'ingreso') dailyIncome[day - 1] += parseFloat(t.monto) || 0;
      if (t.tipo === 'gasto') dailyExpense[day - 1] += parseFloat(t.monto) || 0;
    }
  });
  for (let i = 0; i < daysInMonth; i++) dailyNet[i] = dailyIncome[i] - dailyExpense[i];

  // Tasa de ahorro acumulada diaria
  const dailyRate = [];
  let accIn = 0, accOut = 0;
  for (let i = 0; i < daysInMonth; i++) {
    accIn += dailyIncome[i];
    accOut += dailyExpense[i];
    dailyRate.push(accIn > 0 ? Math.max(0, ((accIn - accOut) / accIn) * 100) : 0);
  }

  // Últimos movimientos
  const recentTxs = store.getAll('transactions')
    .sort((a, b) => {
      const dateA = a.fecha || (a.createdAt ? a.createdAt.split('T')[0] : '0000-00-00');
      const dateB = b.fecha || (b.createdAt ? b.createdAt.split('T')[0] : '0000-00-00');
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    })
    .slice(0, 6);

  // Top cuentas por liquidez
  const accountsByLiquidity = [...activeAccounts]
    .map(a => ({ ...a, saldoReal: calcAccountBalance(a.id) }))
    .sort((x, y) => y.saldoReal - x.saldoReal)
    .slice(0, 4);

  // Top receivables
  const byClient = {};
  store.getAll('receivables').filter(r => r.estado !== 'pagada').forEach(r => {
    byClient[r.entidad || 'Sin nombre'] = (byClient[r.entidad || 'Sin nombre'] || 0) + (parseFloat(r.saldoPendiente) || 0);
  });
  const topReceivables = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Partes numéricas del patrimonio para el hero
  const heroParts = splitMoneyParts(patrimonioNeto);
  const deltaHero = deltaNet;
  const deltaHeroClass = Math.abs(deltaHero) < 0.5 ? 'flat' : (deltaHero >= 0 ? 'up' : 'down');
  const deltaHeroSign = deltaHero >= 0 ? '+' : '−';

  // --- MARKUP ---
  page.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p>${getMonthName(currentMonth)} · visión general</p>
      </div>
      <div class="page-header-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="location.hash='#/transactions?action=new-income'">${icon('plus', 14)} Movimiento</button>
      </div>
    </div>

    <!-- ========== HERO · Patrimonio neto ========== -->
    <section class="dash-hero">
      <div class="dash-hero-main">
        <div class="dash-hero-label">Patrimonio neto</div>
        <div class="dash-hero-metric num-mono" id="hero-metric" data-target="${patrimonioNeto}">
          <span class="currency">${heroParts.currency}</span>${heroParts.sign}${heroParts.int}<span class="cents">.${heroParts.dec}</span>
        </div>
        <div class="dash-hero-sub">
          <span class="dash-hero-delta ${deltaHeroClass}">${deltaHeroSign}${Math.abs(deltaHero).toFixed(1)}% vs mes anterior</span>
          <span class="dash-hero-sep">·</span>
          <span class="dash-hero-meta">Activos ${formatMoney(totalActivos)} — Pasivos ${formatMoney(totalPasivos)}</span>
        </div>
      </div>
      <div class="dash-hero-side">
        <div class="dash-hero-cell">
          <div class="dash-hero-cell-label">Activos líquidos</div>
          <div class="dash-hero-cell-value num-mono">${formatMoney(sumAccounts)}</div>
        </div>
        <div class="dash-hero-cell">
          <div class="dash-hero-cell-label">Por cobrar</div>
          <div class="dash-hero-cell-value num-mono">${formatMoney(sumReceivables)}</div>
        </div>
        <div class="dash-hero-cell">
          <div class="dash-hero-cell-label">Tarjetas</div>
          <div class="dash-hero-cell-value num-mono neg">${formatMoney(sumCards)}</div>
        </div>
        <div class="dash-hero-cell">
          <div class="dash-hero-cell-label">Deudas</div>
          <div class="dash-hero-cell-value num-mono neg">${formatMoney(sumDebts + sumPayables + sumLoanCommitments)}</div>
        </div>
      </div>
    </section>

    <!-- ========== ACTION STRIP ========== -->
    ${(pendingSubs > 0 || unreadNotifs > 0 || overduePayables > 0) ? `
    <div class="action-strip">
      ${pendingSubs > 0 ? `
        <button class="action-chip ${pendingSubs > 2 ? 'urgent' : 'warn'}" onclick="location.hash='#/subscriptions'">
          ${icon('subscription', 14)} <span>${pendingSubs} cobro${pendingSubs !== 1 ? 's' : ''} por confirmar</span>
        </button>` : ''}
      ${overduePayables > 0 ? `
        <button class="action-chip urgent" onclick="location.hash='#/payables'">
          ${icon('alert', 14)} <span>${overduePayables} pago${overduePayables !== 1 ? 's' : ''} vencido${overduePayables !== 1 ? 's' : ''}</span>
        </button>` : ''}
      ${unreadNotifs > 0 ? `
        <button class="action-chip" onclick="location.hash='#/notifications'">
          ${icon('notification', 14)} <span>${unreadNotifs} notificaci${unreadNotifs !== 1 ? 'ones' : 'ón'}</span>
        </button>` : ''}
    </div>` : ''}

    <!-- ========== KPI ROW con sparklines ========== -->
    <div class="kpi-row">
      <div class="kpi-tile">
        <div class="kpi-tile-label">Ingresos del mes</div>
        <div class="kpi-tile-value num-mono" id="kpi-income" data-target="${incomeMonth}">RD$ 0</div>
        <div class="kpi-tile-meta">
          <span class="kpi-tile-delta ${deltaIncome >= 0 ? 'up' : 'down'}">${deltaIncome >= 0 ? '+' : ''}${deltaIncome.toFixed(1)}%</span>
          <span class="kpi-tile-hint">vs ${getMonthName(prevMonth).split(' ')[0]}</span>
        </div>
        <div class="kpi-tile-spark" style="color:var(--ok)">
          ${miniSparkline(dailyIncome, 120, 34, 'var(--ok)')}
        </div>
      </div>

      <div class="kpi-tile">
        <div class="kpi-tile-label">Gastos del mes</div>
        <div class="kpi-tile-value num-mono" id="kpi-expense" data-target="${expenseMonth}">RD$ 0</div>
        <div class="kpi-tile-meta">
          <span class="kpi-tile-delta ${deltaExpense <= 0 ? 'up' : 'down'}">${deltaExpense >= 0 ? '+' : ''}${deltaExpense.toFixed(1)}%</span>
          <span class="kpi-tile-hint">vs ${getMonthName(prevMonth).split(' ')[0]}</span>
        </div>
        <div class="kpi-tile-spark" style="color:var(--bad)">
          ${miniSparkline(dailyExpense, 120, 34, 'var(--bad)')}
        </div>
      </div>

      <div class="kpi-tile">
        <div class="kpi-tile-label">Ahorro neto</div>
        <div class="kpi-tile-value num-mono" id="kpi-net" data-target="${netMonth}">RD$ 0</div>
        <div class="kpi-tile-meta">
          <span class="kpi-tile-delta ${deltaNet >= 0 ? 'up' : 'down'}">${deltaNet >= 0 ? '+' : ''}${deltaNet.toFixed(1)}%</span>
          <span class="kpi-tile-hint">vs ${getMonthName(prevMonth).split(' ')[0]}</span>
        </div>
        <div class="kpi-tile-spark" style="color:var(--accent)">
          ${miniSparkline(dailyNet.map(v => v < 0 ? 0 : v), 120, 34, 'var(--accent)')}
        </div>
      </div>

      <div class="kpi-tile">
        <div class="kpi-tile-label">Tasa de ahorro</div>
        <div class="kpi-tile-value num-mono"><span id="kpi-rate" data-target="${tasaAhorro}">0</span>%</div>
        <div class="kpi-tile-meta">
          <span class="kpi-tile-delta ${tasaAhorro >= 20 ? 'up' : tasaAhorro >= 10 ? 'flat' : 'down'}">${tasaAhorro >= 20 ? 'Saludable' : tasaAhorro >= 10 ? 'Aceptable' : 'Bajo'}</span>
          <span class="kpi-tile-hint">meta 20%</span>
        </div>
        <div class="kpi-tile-spark" style="color:var(--info, var(--accent))">
          ${miniSparkline(dailyRate, 120, 34, 'var(--info, var(--accent))')}
        </div>
      </div>
    </div>

    <!-- ========== SPLIT · Categorías + Movimientos ========== -->
    <div class="dash-split">
      <div class="dash-panel">
        <div class="dash-panel-head">
          <div class="dash-panel-title">Gastos por categoría</div>
          <button class="dash-panel-action" onclick="location.hash='#/transactions?type=gasto'">Ver todos →</button>
        </div>
        ${sortedCategories.length > 0 ? `
          <div class="cat-donut-wrap">
            <div class="cat-donut-chart">
              <canvas id="categoryChart"></canvas>
              <div class="cat-donut-center">
                <div class="cat-donut-label">Total</div>
                <div class="cat-donut-value num-mono">${formatMoney(expenseMonth)}</div>
              </div>
            </div>
            <div class="cat-legend">
              ${sortedCategories.map(([catId, amount]) => {
                const cat = getCategoryById(catId);
                const pct = expenseMonth > 0 ? (amount / expenseMonth) * 100 : 0;
                return `
                  <div class="cat-legend-row">
                    <span class="cat-legend-dot" style="background:${cat?.color || 'var(--accent)'}"></span>
                    <span class="cat-legend-name">${cat?.nombre || 'Otros'}</span>
                    <span class="cat-legend-pct num-mono">${pct.toFixed(0)}%</span>
                    <span class="cat-legend-amount num-mono">${formatMoney(amount)}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="empty-state" style="padding:32px 0">
            ${icon('pieChart', 36)}
            <h3>Sin gastos este mes</h3>
            <p>Cuando registres gastos aquí verás la distribución.</p>
          </div>
        `}
      </div>

      <div class="dash-panel">
        <div class="dash-panel-head">
          <div class="dash-panel-title">Movimientos recientes</div>
          <button class="dash-panel-action" onclick="location.hash='#/transactions'">Ver todos →</button>
        </div>
        ${recentTxs.length > 0 ? `
          <div class="recent-list">
            ${recentTxs.slice(0, 5).map(tx => {
              const cat = getCategoryById(tx.categoriaId);
              const isIncome = tx.tipo === 'ingreso';
              const isTransfer = tx.tipo === 'transferencia';
              const iconClass = isIncome ? 'in' : isTransfer ? 'accent' : 'out';
              const iconName = isIncome ? 'arrowDown' : isTransfer ? 'transaction' : 'arrowUp';
              return `
                <div class="recent-item">
                  <div class="recent-icon ${iconClass}">${icon(iconName, 14)}</div>
                  <div class="recent-body">
                    <div class="recent-desc">${tx.descripcion || 'Sin descripción'}</div>
                    <div class="recent-meta">${cat?.nombre || '—'} · ${tx.fecha || '—'}</div>
                  </div>
                  <div class="recent-amount num-mono ${isIncome ? 'pos' : isTransfer ? '' : 'neg'}">
                    ${isIncome ? '+' : isTransfer ? '' : '−'}${formatMoney(tx.monto)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state" style="padding:32px 0">
            ${icon('transaction', 36)}
            <h3>Sin movimientos aún</h3>
            <p>Registra tu primer ingreso o gasto.</p>
            <button class="btn btn-primary btn-sm" onclick="location.hash='#/transactions'">${icon('plus', 14)} Registrar</button>
          </div>
        `}
      </div>
    </div>

    <!-- ========== Tendencia mensual (gráfico de barras) ========== -->
    <div class="card" style="margin-top:24px">
      <div class="card-header">
        <h3>Tendencia del mes</h3>
        <div style="display:flex;gap:12px;font-size:0.72rem;color:var(--text-2)">
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--ok)"></span>Ingresos</span>
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--bad)"></span>Gastos</span>
        </div>
      </div>
      <div style="position:relative;height:220px;width:100%">
        <canvas id="trendChart"></canvas>
      </div>
    </div>

    <!-- ========== Salud financiera + Liquidez ========== -->
    <div class="grid grid-2" style="margin-top:24px">
      <div class="card" style="display:flex;flex-direction:column;gap:18px">
        <div class="card-header" style="margin-bottom:0">
          <h3>Salud financiera</h3>
          <span class="num-mono" style="font-size:0.75rem;color:var(--text-2)">Score ${scoreFinanciero}/100</span>
        </div>
        <div style="display:flex;align-items:center;gap:20px">
          <div style="position:relative;width:110px;height:110px;flex-shrink:0">
            <svg viewBox="0 0 120 120" width="110" height="110" style="transform:rotate(-90deg)">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-3)" stroke-width="8"/>
              <circle id="score-ring" cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray="${(2 * Math.PI * 52).toFixed(1)}"
                stroke-dashoffset="${(2 * Math.PI * 52).toFixed(1)}"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div id="score-val" data-target="${scoreFinanciero}" class="num-mono" style="font-size:1.6rem;font-weight:600;line-height:1;color:var(--text-0)">0</div>
              <div style="font-size:0.65rem;color:var(--text-2);margin-top:2px;letter-spacing:0.05em">/ 100</div>
            </div>
          </div>
          <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:0.68rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:4px">Tasa de ahorro</div>
              <div class="num-mono" style="font-weight:600;font-size:1rem;color:var(--ok)">${tasaAhorro.toFixed(1)}%</div>
            </div>
            <div>
              <div style="font-size:0.68rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:4px">Ratio pasivos</div>
              <div class="num-mono" style="font-weight:600;font-size:1rem;color:${totalPasivos > totalActivos ? 'var(--bad)' : 'var(--text-0)'}">
                ${totalActivos > 0 ? ((totalPasivos / totalActivos) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div>
              <div style="font-size:0.68rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:4px">Cuentas activas</div>
              <div class="num-mono" style="font-weight:600;font-size:1rem;color:var(--text-0)">${activeAccounts.length}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:4px">Tarjetas</div>
              <div class="num-mono" style="font-weight:600;font-size:1rem;color:var(--text-0)">${activeCards.length}</div>
            </div>
          </div>
        </div>
        <div style="padding:12px 14px;background:var(--bg-2);border-radius:var(--r-md);font-size:0.82rem;color:var(--text-1);line-height:1.5;border-left:2px solid var(--accent)">
          ${scoreFinanciero >= 75
            ? 'Estás ahorrando más del 40% de tus ingresos. Considera invertir el excedente.'
            : expenseMonth > incomeMonth
              ? 'Tus gastos superan los ingresos este mes. Revisa las categorías que más consumen.'
              : 'Mantén un colchón de 3 a 6 meses de gastos en tu cuenta de ahorro.'}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Liquidez por cuenta</h3>
          <button class="dash-panel-action" onclick="location.hash='#/accounts'">Ver →</button>
        </div>
        ${accountsByLiquidity.length > 0 ? `
          <div class="recent-list">
            ${accountsByLiquidity.map(acc => `
              <div class="recent-item">
                <div class="recent-icon accent">${(acc.nombre || 'C').substring(0, 2).toUpperCase()}</div>
                <div class="recent-body">
                  <div class="recent-desc">${acc.nombre || 'Cuenta'}</div>
                  <div class="recent-meta">${acc.banco || 'Banco'}</div>
                </div>
                <div class="recent-amount num-mono">${formatMoney(acc.saldoReal)}</div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state" style="padding:24px 0"><p>Agrega una cuenta bancaria.</p></div>'}
      </div>
    </div>

    <!-- ========== Diezmo + Suscripciones + Por cobrar ========== -->
    <div class="grid grid-3" style="margin-top:24px">
      <div class="card">
        <div class="card-header">
          <h3>Aparta el 10%</h3>
        </div>
        <div style="padding:8px 0">
          <div style="font-size:0.7rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:6px">Base de ingresos</div>
          <div class="num-mono" style="font-size:1.1rem;font-weight:600;margin-bottom:16px">${formatMoney(incomeBase10)}</div>
          <div style="font-size:0.7rem;color:var(--text-2);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:6px">Sugerido apartar</div>
          <div class="num-mono" style="font-size:1.6rem;font-weight:700;color:var(--accent);margin-bottom:14px">${formatMoney(titheAmount)}</div>
        </div>
        <button class="btn btn-secondary btn-sm btn-block" onclick="location.hash='#/tithe'">Ir al módulo</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Suscripciones</h3>
          <button class="dash-panel-action" onclick="location.hash='#/subscriptions'">Ver →</button>
        </div>
        <div style="padding:12px 0">
          <div class="num-mono" style="font-size:2.4rem;font-weight:700;line-height:1;color:${pendingSubs > 0 ? 'var(--warn)' : 'var(--text-0)'}">${pendingSubs}</div>
          <div style="font-size:0.72rem;color:var(--text-2);margin-top:4px;letter-spacing:0.03em;text-transform:uppercase">Por confirmar</div>
        </div>
        ${pendingSubs > 0 ? `
          <button class="btn btn-primary btn-sm btn-block" onclick="location.hash='#/subscriptions'">Revisar ahora</button>
        ` : `
          <div style="font-size:0.82rem;color:var(--ok);font-weight:500;display:flex;align-items:center;gap:6px">${icon('checkCircle', 14)} Todo al día</div>
        `}
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Por cobrar</h3>
          <button class="dash-panel-action" onclick="location.hash='#/receivables'">Ver →</button>
        </div>
        ${topReceivables.length > 0 ? `
          <div class="recent-list">
            ${topReceivables.slice(0, 3).map(([nombre, monto]) => `
              <div class="recent-item">
                <div class="recent-icon in">${(nombre || 'X').substring(0, 1).toUpperCase()}</div>
                <div class="recent-body">
                  <div class="recent-desc">${nombre}</div>
                </div>
                <div class="recent-amount num-mono pos">${formatMoney(monto)}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="padding:20px 0;text-align:center;font-size:0.82rem;color:var(--text-2)">Sin cuentas por cobrar</div>
        `}
      </div>
    </div>
  `;

  // --- Post-render: charts + count-ups + score ring ---
  setTimeout(() => {
    // Chart.js theme-aware
    if (window.Chart) {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const textColor = isDark ? 'rgba(230, 230, 250, 0.55)' : 'rgba(20, 20, 40, 0.55)';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

      const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
      if (ctxTrend) {
        new Chart(ctxTrend, {
          type: 'bar',
          data: {
            labels: labelsDay,
            datasets: [
              { label: 'Ingresos', data: dailyIncome, backgroundColor: 'rgba(16, 185, 129, 0.75)', borderRadius: 3, borderSkipped: false },
              { label: 'Gastos', data: dailyExpense, backgroundColor: 'rgba(239, 68, 68, 0.75)', borderRadius: 3, borderSkipped: false }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 10, family: 'Geist Mono, ui-monospace, monospace' } } },
              x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10, family: 'Geist Mono, ui-monospace, monospace' }, maxRotation: 0, autoSkipPadding: 12 } }
            }
          }
        });
      }

      const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
      if (ctxCat && sortedCategories.length > 0) {
        new Chart(ctxCat, {
          type: 'doughnut',
          data: {
            labels: sortedCategories.map(c => getCategoryById(c[0])?.nombre || 'Otros'),
            datasets: [{
              data: sortedCategories.map(c => c[1]),
              backgroundColor: sortedCategories.map(c => getCategoryById(c[0])?.color || '#888'),
              borderWidth: 0,
              spacing: 2
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '76%',
            plugins: { legend: { display: false }, tooltip: { enabled: true } }
          }
        });
      }
    }

    // Count-up de los KPI
    const countup = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const target = parseFloat(el.dataset.target || '0');
      animateValue(el, 0, target, 1100);
    };
    countup('kpi-income');
    countup('kpi-expense');
    countup('kpi-net');

    // Rate count-up (sin formato de moneda)
    const rateEl = document.getElementById('kpi-rate');
    if (rateEl) {
      const target = parseFloat(rateEl.dataset.target || '0');
      let start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / 1100);
        const eased = 1 - Math.pow(1 - p, 3);
        rateEl.textContent = (target * eased).toFixed(1);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Hero metric: solo anima el entero
    const heroEl = document.getElementById('hero-metric');
    if (heroEl) {
      const target = parseFloat(heroEl.dataset.target || '0');
      const abs = Math.abs(target);
      const sign = target < 0 ? '−' : '';
      const dec = (abs - Math.floor(abs)).toFixed(2).slice(2);
      let start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / 1400);
        const eased = 1 - Math.pow(1 - p, 4);
        const v = Math.floor(abs * eased);
        heroEl.innerHTML = `<span class="currency">RD$</span>${sign}${v.toLocaleString('en-US')}<span class="cents">.${dec}</span>`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Score ring fill
    const ring = document.getElementById('score-ring');
    const scoreVal = document.getElementById('score-val');
    if (ring) {
      const circ = 2 * Math.PI * 52;
      const pct = scoreFinanciero / 100;
      requestAnimationFrame(() => {
        ring.style.transition = 'stroke-dashoffset 1400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        ring.style.strokeDashoffset = String(circ * (1 - pct));
      });
    }
    if (scoreVal) {
      const target = parseInt(scoreVal.dataset.target || '0', 10);
      let v = 0;
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / 1200);
        const eased = 1 - Math.pow(1 - p, 3);
        v = Math.round(target * eased);
        scoreVal.textContent = String(v);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, 80);

  return page;
}

export { getTotalPatrimony };
