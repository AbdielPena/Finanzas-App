const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/debts.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add aiBadge import
content = content.replace(
  /generateId, formatMoney, formatDate, getToday, percentage/,
  'generateId, formatMoney, formatDate, getToday, percentage, aiBadge'
);

// 2. Add getExtCardOptions function
const extCardHelpers = `
function getExtCardOptions() {
  return store.getAll('external_cards').filter(c => c.activa !== false)
    .map(c => \`<option value="extcard:\${c.id}">🌐 \${c.nombre} (\${c.banco})</option>\`).join('');
}
`;
content = content.replace(/\/\/ ── Normalize debt/g, extCardHelpers + '\n// ── Normalize debt');

// 3. Add to optgroups in debtForm and paymentForm
content = content.replace(
  /<optgroup label="💳 Tarjetas">\$\{getCardOptions\(\)\}<\/optgroup>/g,
  `<optgroup label="💳 Tarjetas">\${getCardOptions()}</optgroup>\n          <optgroup label="🌐 Tarjetas Externas">\${getExtCardOptions()}</optgroup>`
);

// 4. In openDebtModal handling
content = content.replace(
  /let cuentaId = null, tarjetaId = null;\s+if \(source\.startsWith\('account:'\)\) cuentaId = source\.split\(':'\)\[1\];\s+else if \(source\.startsWith\('card:'\)\) tarjetaId = source\.split\(':'\)\[1\];/,
  `let cuentaId = null, tarjetaId = null, tarjetaExternaId = null;
      if (source.startsWith('account:')) cuentaId = source.split(':')[1];
      else if (source.startsWith('card:')) tarjetaId = source.split(':')[1];
      else if (source.startsWith('extcard:')) tarjetaExternaId = source.split(':')[1];`
);

content = content.replace(
  /cuentaId,\s+tarjetaId,\s+notas:/,
  `cuentaId,\n        tarjetaId,\n        tarjetaExternaId,\n        notas:`
);

// Preselect in openDebtModal and openPayModal
content = content.replace(
  /else if \(d\.tarjetaId\) sel\.value = `card:\$\{d\.tarjetaId\}`;/g,
  `else if (d.tarjetaId) sel.value = \`card:\${d.tarjetaId}\`;\n        else if (d.tarjetaExternaId) sel.value = \`extcard:\${d.tarjetaExternaId}\`;`
);
content = content.replace(
  /else if \(debt\.tarjetaId\) sel\.value = `card:\$\{debt\.tarjetaId\}`;/g,
  `else if (debt.tarjetaId) sel.value = \`card:\${debt.tarjetaId}\`;\n      else if (debt.tarjetaExternaId) sel.value = \`extcard:\${debt.tarjetaExternaId}\`;`
);

// 5. In openPayModal handling
content = content.replace(
  /let cuentaId = null, tarjetaId = null;\s+if \(source\.startsWith\('account:'\)\) cuentaId = source\.split\(':'\)\[1\];\s+else if \(source\.startsWith\('card:'\)\) tarjetaId = source\.split\(':'\)\[1\];/,
  `let cuentaId = null, tarjetaId = null, tarjetaExternaId = null;
      if (source.startsWith('account:')) cuentaId = source.split(':')[1];
      else if (source.startsWith('card:')) tarjetaId = source.split(':')[1];
      else if (source.startsWith('extcard:')) tarjetaExternaId = source.split(':')[1];`
);

// add to transactions mapping
content = content.replace(
  /tarjetaId: tarjetaId \|\| '',\s+fecha,/,
  `tarjetaId: tarjetaId || '',
        tarjetaExternaId: tarjetaExternaId || '',
        fecha,`
);

// Update external card balance
content = content.replace(
  /\/\/ 3\. Update debt balance/,
  `// Update external card balance if paid by external card
      if (tarjetaExternaId) {
        const extc = store.getById('external_cards', tarjetaExternaId);
        if (extc) store.update('external_cards', tarjetaExternaId, { saldoUsado: (parseFloat(extc.saldoUsado) || 0) + amountPaid });
      }

      // 3. Update debt balance`
);

// 6. Add aiBadge to UI
content = content.replace(
  /<span style="font-weight:600;font-size:0.95rem">\$\{d\.descripcion\}<\/span>/,
  `<span style="font-weight:600;font-size:0.95rem">\${d.descripcion}\${aiBadge(d)}</span>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('debts.js successfully patched with external cards and AI badges');
