import store from './store.js';

/**
 * Calcula el saldo disponible de una cuenta considerando transacciones activas y transferencias.
 */
export function calcAccountBalance(accountId) {
  const account = store.getById('accounts', accountId);
  if (!account) return 0;
  
  // Transacciones donde esta cuenta es la ORIGEN
  // (Gastos, Transferencias salientes, e Ingresos -aunque ingresos usualmente no restan, aquí los filtramos por tipo)
  const txs = store.filter('transactions', t => t.cuentaId === accountId && t.estado !== 'hold');
  let balance = parseFloat(account.saldoInicial) || 0;
  
  txs.forEach(t => {
    if (t.tipo === 'ingreso') balance += parseFloat(t.monto) || 0;
    else if (t.tipo === 'gasto') balance -= parseFloat(t.monto) || 0;
    else if (t.tipo === 'transferencia') balance -= parseFloat(t.monto) || 0;
  });
  
  // Transacciones donde esta cuenta es la DESTINO (Solo transferencias por ahora)
  const incoming = store.filter('transactions', t => t.cuentaDestinoId === accountId && t.tipo === 'transferencia' && t.estado !== 'hold');
  incoming.forEach(t => { balance += parseFloat(t.monto) || 0; });
  
  return balance;
}

/**
 * Calcula el patrimonio neto (Activos Líquidos - Deuda en Tarjetas)
 */
export function getTotalPatrimony() {
  const accounts = store.getAll('accounts').filter(a => a.activa !== false);
  let total = 0;
  accounts.forEach(a => { total += calcAccountBalance(a.id); });
  
  const cards = store.getAll('cards').filter(c => c.activa !== false);
  cards.forEach(c => { total -= parseFloat(c.saldoUsado) || 0; });
  
  return total;
}
