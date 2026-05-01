const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/utils.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('export function aiBadge')) {
  content += `\n// ---------- AI Tools ----------\nexport function aiBadge(item) {\n  return item?._aiModified ? '<span class="ai-badge" title="Operación ejecutada por IA" style="font-size:0.85em; margin-left:4px">🤖</span>' : '';\n}\n`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added aiBadge to utils.js');
}
