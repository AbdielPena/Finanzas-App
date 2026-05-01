const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/main.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('renderSuperAdmin')) {
  // Add below renderUsers
  content = content.replace(
    /import renderUsers from '\.\/pages\/users\.js';/,
    `import renderUsers from './pages/users.js';\nimport renderSuperAdmin from './pages/superadmin.js';`
  );
}

// 2. Add SuperAdmin to sidebar
const superAdminLink = `
            \${currentUser?.isSuperAdmin ? \`
            <div class="sidebar-section-title" style="margin-top:10px;color:var(--color-warning)">Administración Global</div>
            <button class="nav-item" data-route="/superadmin" style="color:var(--color-warning)">
              \${icon('lock', 20)}
              <span class="nav-item-label">Super Administrador</span>
            </button>\` : ''}`;

if (!content.includes('data-route="/superadmin"')) {
  content = content.replace(
    /<\/button>` : ''}\s+<\/div>\s+<\/nav>/g,
    `</button>\` : ''}\n${superAdminLink}\n          </div>\n        </nav>`
  );
}

// 3. Register route
if (!content.includes('router.register(\'/superadmin\',')) {
  content = content.replace(
    /router\.register\('\/profile', renderProfile\);/,
    `router.register('/superadmin', currentUser?.isSuperAdmin ? renderSuperAdmin : () => { const d = document.createElement('div'); d.className='page-content'; d.innerHTML='<div class="empty-state card"><h3>Acceso denegado</h3><p>Requiere privilegios de Super Administrador.</p></div>'; return d; });
  router.register('/profile', renderProfile);`
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('main.js patched with superadmin successfully.');
