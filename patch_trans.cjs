const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/transactions.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add aiBadge import
if (!content.includes('aiBadge')) {
  content = content.replace(
    /percentage, getCurrentMonth, getMonthName/,
    'percentage, getCurrentMonth, getMonthName, aiBadge'
  );

  // 2. Add aiBadge to UI
  if (content.includes('\${t.descripcion}</div>')) {
    content = content.replace(
      /(\$\{t\.descripcion\})([^<]*<\/div>)/g,
      '$1${aiBadge(t)}$2'
    );
  }
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('transactions.js successfully patched with AI badges');
}
