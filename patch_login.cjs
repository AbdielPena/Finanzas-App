const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/login.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
content = content.replace(
  /import \{\s+hasAnyUsers,\s*loginUser,\s*registerUser,\s*selectWorkspace,\s+ROLES,\s*hasLegacyData\s+\} from '\.\.\/auth\.js';/,
  `import {
  hasAnyUsers, loginUser, registerUser, selectWorkspace,
  ROLES, hasLegacyData, finishForcedPasswordChange
} from '../auth.js';`
);

// 2. Add forcedPasswordChangeScreen function definition
const forcedScreenFunc = `

  // ── Forced Password Change Screen
  function forcedPasswordChangeScreen(user, workspaces, onSuccess) {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;max-width:440px';
    div.innerHTML = \`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2rem;margin-bottom:8px">🔐</div>
        <h2 style="font-size:1.2rem;margin:0">Actualización Requerida</h2>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Hola \${user.nombre}, el administrador ha solicitado que restablezcas tu contraseña antes de continuar.</p>
      </div>
      <div class="card" style="padding:24px">
        <form id="force-pass-form">
          <div class="form-group">
            <label class="form-label">Nueva Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass" placeholder="Mínimo 6 caracteres" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass2" placeholder="Repite la contraseña" required />
          </div>
          <div id="fp-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="fp-btn">
            Actualizar y Entrar →
          </button>
        </form>
      </div>
    \`;

    div.querySelector('#force-pass-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = div.querySelector('#fp-error');
      const btn   = div.querySelector('#fp-btn');
      errEl.style.display = 'none';

      const pass = div.querySelector('#fp-pass').value;
      const pass2 = div.querySelector('#fp-pass2').value;

      if (pass !== pass2) {
        errEl.textContent = 'Las contraseñas no coinciden.';
        errEl.style.display = 'block';
        return;
      }
      if (pass.length < 6) {
        errEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Actualizando...';

      try {
        await finishForcedPasswordChange(user.id, pass);
        // Continue login flow
        if (workspaces.length === 1) {
          selectWorkspace(user.id, workspaces[0].id);
          onSuccess();
        } else {
          showScreen(() => workspaceSelector(user, workspaces, onSuccess));
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Actualizar y Entrar →';
      }
    });

    return div;
  }
`;

content = content.replace(/\/\/ ── Initial render/, forcedScreenFunc + '\n  // ── Initial render');

// 3. Update the login handling to intercept forcePasswordChange mapping
content = content.replace(
  /const \{ user, workspaces \} = await loginUser\(emailVal, passVal\);\s+if \(workspaces\.length === 1\) \{/,
  `const result = await loginUser(emailVal, passVal);
        let user = result.user;
        let workspaces = result.workspaces;

        // If forced to change, wait
        if (result.forcePasswordChange) {
           // Provide an empty array for workspaces just for the signature, since the reset flow needs to re-fetch or we just pass the raw user
           showScreen(() => forcedPasswordChangeScreen(user, user.workspaces || [], onSuccess));
           return;
        }

        if (workspaces && workspaces.length === 1) {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('login.js patched successfully for force page change.');
