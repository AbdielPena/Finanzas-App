// ============================================
// Settings Page — App configuration
// ============================================
import store from '../store.js';
import { icon } from '../icons.js';
import { getCurrencies, THEME_PALETTES, applyUserPalette } from '../utils.js';
import { showToast, confirmDialog, openModal, closeModal } from '../components.js';
import { getWorkspaceId, logAdminAction } from '../auth.js';
import { exportWorkspaceBackup, parseBackupFile, restoreWorkspaceBackup } from '../backupEngine.js';
import { validateOpenAIKey } from '../ai-agent.js';
import { getPlanSummary, ensureSeeded as ensurePlansSeeded } from '../plans_engine.js';

export default function renderSettings() {
  const page = document.createElement('div');
  page.className = 'page-content animate-fade-in';

  const settings = store.getSettings();
  const currencies = getCurrencies();
  const currentTheme = settings.theme || 'dark';
  const currentCurrency = settings.currency || 'DOP';
  
  // Normalizar palette: puede ser string (key o #hex) o un objeto (Modo Arquitecto)
  // Lo convertimos siempre a string seguro para el template HTML
  const rawPalette = settings.themePalette;
  const currentPalette = (typeof rawPalette === 'string') ? rawPalette : 'azul-fintech';
  const isCustomHex = typeof rawPalette === 'string' && rawPalette.startsWith('#');
  const isArchitectMode = typeof rawPalette === 'object' && rawPalette !== null && rawPalette.isCustom;
  
  // Extraer notificaciones seguras
  const notifConf = settings.notifications || { global: true, anticipationDays: 3, types: {} };

  page.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Configuración</h1>
        <p>Control maestro y personalización premium</p>
      </div>
    </div>

    <div class="grid grid-2 stagger-children">
      <!-- COLUMNA IZQUIERDA -->
      <div>

        <!-- Mi Plan (SaaS) -->
        ${(() => {
          try {
            ensurePlansSeeded();
            const s = getPlanSummary();
            const criticalList = s.usage.filter(u => u.percent >= 70 && u.limit !== -1).slice(0, 6);
            return `
              <div class="card" style="margin-bottom:24px">
                <div class="card-header"><h3>${icon('star', 18)} Mi Plan</h3></div>
                <div class="plan-summary-card" style="margin-top:10px">
                  <div>
                    <div class="plan-summary-name">${s.plan.name}</div>
                    <div style="font-size:0.82rem;color:var(--text-2);margin-top:2px">${s.plan.description || ''}</div>
                    ${s.assignment ? `<div style="font-size:0.78rem;color:var(--text-2);margin-top:6px">Estado: <span class="badge badge-${s.assignment.status === 'active' ? 'success' : 'warning'}">${s.assignment.status}</span></div>` : ''}
                  </div>
                  <div style="text-align:right">
                    <div style="font-family:var(--f-heading);font-size:1.4rem;font-weight:700;color:var(--text-0)">${s.plan.price === 0 ? 'Gratis' : `${s.plan.currency} ${s.plan.price}`}</div>
                    <div style="font-size:0.78rem;color:var(--text-2)">${s.plan.billing === 'annual' ? 'anual' : s.plan.billing === 'once' ? 'único' : 'mensual'}</div>
                    <a href="#/pricing" class="btn btn-primary btn-sm" style="margin-top:10px">Ver planes</a>
                  </div>
                </div>
                ${criticalList.length > 0 ? `
                  <div class="plan-usage-bars">
                    ${criticalList.map(u => {
                      const severity = u.percent >= 100 ? 'bad' : u.percent >= 85 ? 'warn' : '';
                      return `
                        <div class="plan-usage-bar">
                          <div class="plan-usage-bar-head">
                            <span style="color:var(--text-1);font-weight:600">${u.label}</span>
                            <span style="color:var(--text-2);font-variant-numeric:tabular-nums">${u.current}/${u.limit}</span>
                          </div>
                          <div class="plan-usage-bar-track">
                            <div class="plan-usage-bar-fill ${severity}" style="width:${Math.min(100, u.percent)}%"></div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          } catch (e) { return ''; }
        })()}

        <!-- Apariencia y Sistema de Theming -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><h3>${icon('moon', 18)} Estilo Visual y Temas</h3></div>
          
          <div style="padding:12px 0 20px 0; border-bottom:1px solid var(--border-color)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="font-weight:600">Esquema de iluminación</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">Ajusta el fondo de la plataforma</div>
              </div>
            </div>
            <div class="tabs" style="margin:0; width:100%">
              <div class="tab ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" style="flex:1;text-align:center">${icon('moon', 14)} Oscuro</div>
              <div class="tab ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" style="flex:1;text-align:center">${icon('sun', 14)} Claro</div>
            </div>
          </div>

          <div style="padding-top:20px">
            <div style="font-weight:600;margin-bottom:16px">Paleta Premium (Live Theming)</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px" id="palette-container">
              ${Object.entries(THEME_PALETTES).map(([key, palette]) => `
                <div class="color-option ${key === currentPalette ? 'selected' : ''}" 
                     data-palette="${key}"
                     title="${palette.name}"
                     style="background: ${palette.primary}; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; border: 3px solid ${key === currentPalette ? 'var(--text-primary)' : 'transparent'}; box-shadow: 0 4px 10px ${palette.glow}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                </div>
              `).join('')}
              <div class="color-picker-wrapper color-option ${isCustomHex ? 'selected' : ''}" data-custom="true" title="Color Personalizado" style="position:relative; width: 38px; height: 38px; border-radius: 50%; background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red); cursor: pointer; display: flex; align-items: center; justify-content: center; border: 3px solid ${isCustomHex ? 'var(--text-primary)' : 'transparent'}">
                <div style="background:var(--bg-card); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; pointer-events:none">
                  ${icon('edit', 12)}
                </div>
                <input type="color" id="custom-color-picker" value="${isCustomHex ? rawPalette : '#4f46e5'}" style="opacity:0; position:absolute; inset:0; width:100%; height:100%; cursor:pointer">
              </div>
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:12px">El cambio es instantáneo y se aplica a toda la aplicación.</div>
          </div>

          <!-- MODO ARQUITECTO LIBRE -->
          <div style="padding-top:20px; border-top: 1px solid var(--border-color); margin-top:20px">
            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer" id="toggle-architect">
              <div>
                <div style="font-weight:600; color:var(--accent-secondary)">${icon('edit', 14)} Modo Arquitecto</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">Modifica las capas profundas de CSS</div>
              </div>
              <div style="color:var(--text-secondary)" id="architect-chevron">${icon('chevronDown', 16)}</div>
            </div>
            
            <div id="architect-panel" style="display:none; padding-top:16px; flex-direction:column; gap:12px">
              
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--bg-primary</span>
                <input type="color" class="arch-picker" data-var="bgPrimary" value="#000000" style="cursor:pointer">
              </div>
              
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--bg-card</span>
                <input type="color" class="arch-picker" data-var="bgCard" value="#111114" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--text-primary</span>
                <input type="color" class="arch-picker" data-var="textPrimary" value="#fafafa" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--accent-primary</span>
                <input type="color" class="arch-picker" data-var="accentPrimary" value="#4f46e5" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--color-income</span>
                <input type="color" class="arch-picker" data-var="colorIncome" value="#10b981" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--color-expense</span>
                <input type="color" class="arch-picker" data-var="colorExpense" value="#f43f5e" style="cursor:pointer">
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top:12px; margin-top:4px">
                <button class="btn btn-secondary btn-block" id="reset-architect" style="width:100%; font-size:0.8rem">
                  ${icon('refresh', 14)} Restablecer tema predeterminado
                </button>
              </div>

            </div>
          </div>
        </div>

        <!-- Moneda -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><h3>${icon('dollarSign', 18)} Regional</h3></div>
          <div style="padding:12px 0">
            <div style="font-weight:600;margin-bottom:8px">Moneda base</div>
            <select class="form-select" id="currency-select" style="max-width:100%">
              ${Object.entries(currencies).map(([code, curr]) => 
                `<option value="${code}" ${code === currentCurrency ? 'selected' : ''}>${curr.symbol} — ${curr.name} (${code})</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <!-- Mantenimiento -->
        <div class="card">
          <div class="card-header"><h3>${icon('download', 18)} Base de Datos & Privacidad</h3></div>
          <div style="display:flex;flex-direction:column;gap:16px;padding:12px 0">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600">Exportar (Backup)</div><div style="font-size:0.8rem;color:var(--text-secondary)">Descargar JSON encriptado</div></div>
              <button class="btn btn-secondary" id="export-btn">${icon('download', 18)}</button>
            </div>
            <div class="divider"></div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600">Importar</div><div style="font-size:0.8rem;color:var(--text-secondary)">Restaurar backup</div></div>
              <div>
                <input type="file" id="import-input" accept=".json" style="display:none" />
                <button class="btn btn-secondary" id="import-btn">${icon('upload', 18)}</button>
              </div>
            <div class="divider"></div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600;color:var(--color-expense)">Borrar todos los datos</div><div style="font-size:0.8rem;color:var(--text-secondary)">Eliminar permanentemente</div></div>
              <button class="btn btn-danger" id="clear-btn">${icon('trash', 18)} Borrar Todo</button>
            </div>
          </div>
        </div>

      </div>

      <!-- COLUMNA DERECHA -->
      <div>

        <!-- Link rapido a preferencias avanzadas de notificaciones -->
        <div class="card" style="margin-bottom:24px;cursor:pointer" onclick="window.location.hash='#/notification-preferences'">
          <div style="display:flex;align-items:center;gap:14px;padding:4px 0">
            <div style="color:var(--accent-primary)">${icon('notification', 22)}</div>
            <div style="flex:1">
              <div style="font-weight:600">Preferencias de Notificaciones</div>
              <div style="font-size:0.8rem;color:var(--text-secondary)">Email, push (Android), resumenes y diagnostico</div>
            </div>
            <div style="color:var(--text-secondary)">${icon('arrowDown', 18)}</div>
          </div>
        </div>

        <!-- Notificaciones Avanzadas -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <h3>${icon('notification', 18)} Centro de Alertas</h3>
            <label class="toggle-switch" title="Activar/Desactivar todas">
              <input type="checkbox" id="global-notif" ${notifConf.global ? 'checked' : ''}>
              <div class="toggle-slider"></div>
            </label>
          </div>
          
          <div style="padding:12px 0; opacity: ${notifConf.global ? '1' : '0.5'}; pointer-events: ${notifConf.global ? 'auto' : 'none'}; transition: opacity var(--transition-fast)" id="notif-details">
            
            <div style="margin-bottom:24px">
              <div style="font-weight:600;margin-bottom:8px">Anticipación de Alertas</div>
              <select class="form-select" id="notif-anticipation" style="max-width:100%">
                <option value="1" ${notifConf.anticipationDays == 1 ? 'selected' : ''}>Avisar 1 día antes</option>
                <option value="3" ${notifConf.anticipationDays == 3 ? 'selected' : ''}>Avisar 3 días antes</option>
                <option value="7" ${notifConf.anticipationDays == 7 ? 'selected' : ''}>Avisar 1 semana antes</option>
              </select>
            </div>

            <div class="divider" style="margin:20px 0"></div>

            <div style="display:flex;flex-direction:column;gap:16px">
              
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--accent-primary)">${icon('creditCard', 22)}</div>
                  <div><div style="font-weight:600">Pagos de Tarjetas</div><div style="font-size:0.8rem;color:var(--text-secondary)">Cortes y límites</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="cc_payments" ${notifConf.types.cc_payments !== false ? 'checked' : ''}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-warning)">${icon('subscription', 22)}</div>
                  <div><div style="font-weight:600">Suscripciones Próximas</div><div style="font-size:0.8rem;color:var(--text-secondary)">Netflix, Gym, AWS</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="subs" ${notifConf.types.subs !== false ? 'checked' : ''}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-expense)">${icon('alert', 22)}</div>
                  <div><div style="font-weight:600">Deudas Pendientes</div><div style="font-size:0.8rem;color:var(--text-secondary)">Obligaciones atrasadas</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="debts" ${notifConf.types.debts !== false ? 'checked' : ''}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-income)">${icon('receivable', 22)}</div>
                  <div><div style="font-weight:600">Cuentas por Cobrar</div><div style="font-size:0.8rem;color:var(--text-secondary)">Dinero que te deben</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="receivables" ${notifConf.types.receivables !== false ? 'checked' : ''}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-info)">${icon('brain', 22)}</div>
                  <div><div style="font-weight:600">Asistente Inteligente</div><div style="font-size:0.8rem;color:var(--text-secondary)">Consejos y estrategias de pago</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="smart" ${notifConf.types.smart !== false ? 'checked' : ''}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

            </div>
          </div>
        </div>

        <button class="btn btn-danger btn-block" id="logout-btn" style="margin-top:12px">${icon('logout', 18)} Cerrar Sesión Segura</button>

        <!-- FinanzBot API Key -->
        <div class="card" id="ai-card" style="margin-top:24px; border-color: var(--accent-primary); border-width:1.5px">
          <div class="card-header" style="background: linear-gradient(135deg, var(--accent-primary)15, transparent)">
            <h3 style="display:flex;align-items:center;gap:8px">🤖 FinanzBot — Asistente IA</h3>
            <div id="api-status-badge">
               ${store.getSetting('openaiKey') 
                 ? '<span class="badge badge-success" style="font-size:0.6rem">CONFIGURADO</span>' 
                 : '<span class="badge badge-warning" style="font-size:0.6rem">PENDIENTE</span>'}
            </div>
          </div>
          <div style="padding:12px 0">
            <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">
              Conecta FinanzBot con <strong>tu propia API Key</strong> de OpenAI. Esta configuración es privada para este espacio de trabajo.
            </div>
            <div style="font-weight:600;margin-bottom:8px">OpenAI API Key</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;gap:8px">
                <input type="password" id="openai-key-input" class="form-select" 
                  placeholder="sk-proj-..." 
                  value="${store.getSetting('openaiKey', '')}"
                  style="flex:1;font-family:monospace;font-size:0.8rem">
                <button class="btn btn-secondary" id="test-api-key" title="Probar Conexión">${icon('refresh', 16)}</button>
                <button class="btn btn-primary" id="save-api-key" title="Guardar cambios">${icon('checkCircle', 16)}</button>
              </div>
              <div id="api-validation-msg" style="font-size:0.75rem; min-height:18px"></div>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">
              🔒 <strong>Privacidad:</strong> Tu llave se guarda cifrada localmente y solo se usa para las peticiones de este workspace.
            </div>
          </div>
        </div>

        <!-- Studio Business Hub — Modo del Workspace -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><h3>🔗 Modo del Workspace</h3></div>
          <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:12px">
            Define cómo se usará este workspace dentro de la suite Studio Business Hub.
          </p>
          <div id="workspace-mode-toggle" style="display:flex;flex-direction:column;gap:10px">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;cursor:pointer" data-mode-option>
              <input type="radio" name="workspace-mode" value="PERSONAL" style="margin-top:3px">
              <div>
                <div style="font-weight:600">Personal</div>
                <div style="font-size:0.78rem;color:var(--text-2)">Finanzas personales (diezmo, metas, deudas, suscripciones). Oculta integraciones del hub.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;cursor:pointer" data-mode-option>
              <input type="radio" name="workspace-mode" value="BUSINESS" style="margin-top:3px">
              <div>
                <div style="font-weight:600">Business</div>
                <div style="font-size:0.78rem;color:var(--text-2)">Contabilidad del estudio. Recibe ingresos automáticos desde el hub cuando se cobran facturas en CRM Studio o Facturación.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;cursor:pointer" data-mode-option>
              <input type="radio" name="workspace-mode" value="HYBRID" style="margin-top:3px">
              <div>
                <div style="font-weight:600">Híbrido</div>
                <div style="font-size:0.78rem;color:var(--text-2)">Ambos. Cada transacción puede marcarse como Personal o Negocio. Los dashboards se filtran por tipo.</div>
              </div>
            </label>
          </div>
          <div id="workspace-mode-status" style="font-size:0.78rem;color:var(--text-muted);margin-top:10px;min-height:18px"></div>
        </div>

      </div>
    </div>
  `;

  const saveNotifConf = () => {
    store.setSetting('notifications', notifConf);
    showToast('success', 'Preferencias actualizadas');
  };

  // Listeners Notificaciones
  const globalToggle = page.querySelector('#global-notif');
  const detailsDiv = page.querySelector('#notif-details');
  globalToggle.addEventListener('change', (e) => {
    notifConf.global = e.target.checked;
    detailsDiv.style.opacity = notifConf.global ? '1' : '0.5';
    detailsDiv.style.pointerEvents = notifConf.global ? 'auto' : 'none';
    saveNotifConf();
  });

  page.querySelector('#notif-anticipation').addEventListener('change', (e) => {
    notifConf.anticipationDays = parseInt(e.target.value, 10);
    saveNotifConf();
  });

  page.querySelectorAll('.notif-type').forEach(chk => {
    chk.addEventListener('change', (e) => {
      notifConf.types[e.target.dataset.type] = e.target.checked;
      saveNotifConf();
    });
  });

  // Light/Dark Theme toggle
  page.querySelectorAll('[data-theme]').forEach(tab => {
    tab.addEventListener('click', () => {
      const theme = tab.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      store.setSetting('theme', theme);
      page.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Live Palette Theming
  page.querySelectorAll('.color-option:not([data-custom="true"])').forEach(opt => {
    opt.addEventListener('click', () => {
      const paletteKey = opt.dataset.palette;
      
      // Update UI Highlights
      page.querySelectorAll('.color-option').forEach(o => {
        o.style.border = '3px solid transparent';
        o.classList.remove('selected');
      });
      opt.style.border = '3px solid var(--text-primary)';
      opt.classList.add('selected');
      
      // Save globally
      store.setSetting('themePalette', paletteKey);
      
      // Morph instantáneo
      applyUserPalette(paletteKey);
    });
  });

  // Custom Color Picker (HSI/Native Picker)
  const colorPicker = page.querySelector('#custom-color-picker');
  const colorPickerWrapper = colorPicker.closest('.color-picker-wrapper');
  
  colorPicker.addEventListener('input', (e) => {
    const hexColor = e.target.value;
    
    // Update UI Highlights
    page.querySelectorAll('.color-option').forEach(o => {
      o.style.border = '3px solid transparent';
      o.classList.remove('selected');
    });
    colorPickerWrapper.style.border = '3px solid var(--text-primary)';
    colorPickerWrapper.classList.add('selected');
    
    // Save globally
    store.setSetting('themePalette', hexColor);
    
    // Morph instantáneo (Utils procesará dinámicamente the color-mix)
    applyUserPalette(hexColor);
  });

  // Architect Mode Logic
  const toggleArch = page.querySelector('#toggle-architect');
  const panelArch = page.querySelector('#architect-panel');
  toggleArch.addEventListener('click', () => {
    const isHidden = panelArch.style.display === 'none';
    panelArch.style.display = isHidden ? 'flex' : 'none';
    
    // Hydrate pickers if showing
    if(isHidden) {
      if (isArchitectMode) {
        page.querySelectorAll('.arch-picker').forEach(picker => {
           const varName = picker.dataset.var;
           if(rawPalette[varName]) picker.value = rawPalette[varName];
        });
      }
    }
  });

  page.querySelectorAll('.arch-picker').forEach(picker => {
    picker.addEventListener('input', () => {
      // Reclect all values
      const customDict = { isCustom: true };
      page.querySelectorAll('.arch-picker').forEach(p => {
        customDict[p.dataset.var] = p.value;
      });
      
      // Update Selection UI
      page.querySelectorAll('.color-option').forEach(o => {
        o.style.border = '3px solid transparent';
        o.classList.remove('selected');
      });

      // Save and Morph globally
      store.setSetting('themePalette', customDict);
      applyUserPalette(customDict);
    });
  });

  // Reset Architect Mode → vuelve al preset por defecto
  page.querySelector('#reset-architect').addEventListener('click', () => {
    const DEFAULT_PALETTE = 'azul-fintech';
    store.setSetting('themePalette', DEFAULT_PALETTE);
    applyUserPalette(DEFAULT_PALETTE);

    // Resaltar el preset visual en el ui
    page.querySelectorAll('.color-option').forEach(o => {
      o.style.border = '3px solid transparent';
      o.classList.remove('selected');
    });
    const defaultDot = page.querySelector(`[data-palette="${DEFAULT_PALETTE}"]`);
    if (defaultDot) defaultDot.style.border = '3px solid var(--text-primary)';

    showToast('success', 'Tema restablecido', 'Volviste al estilo Azul Fintech por defecto');
  });

  // Currency
  page.querySelector('#currency-select').addEventListener('change', (e) => {
    store.setSetting('currency', e.target.value);
    showToast('success', 'Moneda cambiada');
  });

  // Export
  page.querySelector('#export-btn').addEventListener('click', () => {
    const wsId = getWorkspaceId();
    if (exportWorkspaceBackup(wsId)) {
      showToast('success', 'Datos exportados', 'Archivo de respaldo asegurado');
      logAdminAction(wsId, wsId, 'Exportación de Backup Local');
    }
  });

  // Import
  page.querySelector('#import-btn').addEventListener('click', () => page.querySelector('#import-input').click());
  page.querySelector('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { payload, summary, totalItems } = await parseBackupFile(file);
      
      const summaryHTML = `
        <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:16px;">
          Se detectaron <strong>${totalItems}</strong> registros empaquetados en este archivo:
        </div>
        <div style="background:var(--bg-primary); padding:12px; border-radius:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; max-height:200px; overflow-y:auto">
          ${Object.entries(summary).map(([col, len]) => `<div style="display:flex;justify-content:space-between;"><span>${col}:</span> <strong style="color:var(--accent-primary)">${len}</strong></div>`).join('')}
        </div>
        <div style="margin-top:16px; font-size:0.85rem; padding:10px; background:rgba(244, 63, 94, 0.1); color:#f43f5e; border-radius:6px; border:1px solid #f43f5e">
          <strong>⚠️ Atención:</strong> Esta acción reemplazará al 100% tu base de datos actual con la de este archivo.
        </div>
      `;

      const idModal = 'import-preview-modal';
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="modal fade" id="${idModal}">
          <div class="modal-content" style="max-width:500px">
            <div class="modal-header">
              <h3>Resumen de Importación</h3>
              <button class="btn btn-icon js-close-modal">✕</button>
            </div>
            <div class="modal-body">
              ${summaryHTML}
            </div>
            <div class="modal-footer" style="margin-top:20px; display:flex; gap:12px; justify-content:flex-end">
              <button class="btn btn-secondary js-close-modal">Cancelar</button>
              <button class="btn btn-danger" id="confirm-${idModal}">💥 Reemplazar todo</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div.firstElementChild);
      openModal(idModal);

      document.getElementById(`confirm-${idModal}`).addEventListener('click', () => {
        closeModal(idModal);
        try {
          const wsId = getWorkspaceId();
          restoreWorkspaceBackup(wsId, payload);
          logAdminAction(wsId, wsId, 'Inyección Destructiva de Backup');
          showToast('success', 'Entorno Restaurado', 'Reiniciando el sistema...');
        } catch(err) {
          showToast('error', 'Error crítico', err.message);
        }
      });

    } catch (err) {
      showToast('error', 'Rechazado', err.message);
    }
    
    // Resetear valor para que dispare de nuevo si sube el mismo
    e.target.value = '';
  });

  // Clear all
  page.querySelector('#clear-btn').addEventListener('click', async () => {
    const ok = await confirmDialog('⚠️ ¿Borrar todos los datos?', 'Esta acción es IRREVERSIBLE. Se eliminarán todas las cuentas, transacciones, deudas y configuraciones.', { type: 'danger', confirmText: 'Sí, borrar todo' });
    if (ok) {
      store.clearAll();
      showToast('success', 'Todos los datos eliminados');
      setTimeout(() => location.reload(), 1000);
    }
  });

  // Logout
  page.querySelector('#logout-btn').addEventListener('click', () => {
    store.setSession(false);
    location.reload();
  });

  // FinanzBot API Key — save listener
  const keyInput = page.querySelector('#openai-key-input');
  const testBtn  = page.querySelector('#test-api-key');
  const saveBtn  = page.querySelector('#save-api-key');
  const msgEl    = page.querySelector('#api-validation-msg');
  const badgeEl  = page.querySelector('#api-status-badge');
  const wsId     = getWorkspaceId();

  const updateBadge = (status) => {
    if (status === 'valid') badgeEl.innerHTML = '<span class="badge badge-success" style="font-size:0.6rem">VÁLIDA ✓</span>';
    else if (status === 'error') badgeEl.innerHTML = '<span class="badge badge-danger" style="font-size:0.6rem">ERROR ✕</span>';
    else badgeEl.innerHTML = '<span class="badge badge-warning" style="font-size:0.6rem">PENDIENTE</span>';
  };

  testBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) return showToast('error', 'Ingresa una API Key');
    
    testBtn.disabled = true;
    msgEl.innerHTML = '<span style="color:var(--accent-primary)">⌛ Validando conexión...</span>';
    
    const result = await validateOpenAIKey(key);
    testBtn.disabled = false;

    if (result.success) {
      msgEl.innerHTML = '<span style="color:var(--color-income)">✅ Conexión exitosa con OpenAI</span>';
      updateBadge('valid');
      logAdminAction(wsId, wsId, 'CREDENTIAL_TEST_SUCCESS', 'Validación de OpenAI Key exitosa');
    } else {
      msgEl.innerHTML = `<span style="color:var(--color-expense)">❌ Error: ${result.error}</span>`;
      updateBadge('error');
      logAdminAction(wsId, wsId, 'CREDENTIAL_TEST_FAIL', result.error);
    }
  });

  saveBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) {
      showToast('error', 'API Key vacía');
      return;
    }
    if (!key.startsWith('sk-')) {
      showToast('error', 'API Key inválida', 'Debe comenzar con sk-');
      return;
    }
    store.setSetting('openaiKey', key);
    showToast('success', '🤖 Configuración Guardada', 'FinanzBot actualizado en este workspace');
    updateBadge('valid');
    logAdminAction(wsId, wsId, 'CREDENTIAL_CHANGE', 'API Key actualizada y guardada');
  });

  // ============================================================
  // Studio Business Hub — Workspace mode toggle
  // ============================================================
  const modeRadios = page.querySelectorAll('input[name="workspace-mode"]');
  const modeStatusEl = page.querySelector('#workspace-mode-status');
  const apiBase = (typeof window !== 'undefined' && window.__API_BASE__) || '/api/v1';

  async function loadWorkspaceMode() {
    try {
      const token = localStorage.getItem('finanzapp.access_token')
        || (JSON.parse(localStorage.getItem('finanzapp.auth') || '{}').accessToken);
      if (!token) return;
      const res = await fetch(`${apiBase}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const current = (json.data || []).find((w) => w.id === wsId) || json.data?.[0];
      const mode = (current?.mode || 'PERSONAL').toUpperCase();
      const target = page.querySelector(`input[name="workspace-mode"][value="${mode}"]`);
      if (target) target.checked = true;
      page.querySelectorAll('[data-mode-option]').forEach((lbl) => {
        const input = lbl.querySelector('input');
        lbl.style.borderColor = input.checked ? 'var(--accent-primary)' : 'var(--border)';
        lbl.style.background = input.checked ? 'var(--accent-soft, rgba(124,58,237,0.08))' : 'transparent';
      });
      modeStatusEl.textContent = `Modo actual: ${mode}`;
    } catch (e) {
      modeStatusEl.textContent = 'No se pudo cargar el modo.';
    }
  }

  modeRadios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      const mode = radio.value;
      modeStatusEl.textContent = `Guardando ${mode}…`;
      try {
        const token = localStorage.getItem('finanzapp.access_token')
          || (JSON.parse(localStorage.getItem('finanzapp.auth') || '{}').accessToken);
        if (!token) throw new Error('Sesión no encontrada');
        const res = await fetch(`${apiBase}/workspaces/${wsId}/mode`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${res.status}`);
        }
        showToast('success', `Modo cambiado a ${mode}`);
        modeStatusEl.textContent = `Modo actual: ${mode}`;
        page.querySelectorAll('[data-mode-option]').forEach((lbl) => {
          const input = lbl.querySelector('input');
          lbl.style.borderColor = input.checked ? 'var(--accent-primary)' : 'var(--border)';
          lbl.style.background = input.checked ? 'var(--accent-soft, rgba(124,58,237,0.08))' : 'transparent';
        });
      } catch (e) {
        showToast('error', 'No se pudo cambiar el modo', e.message);
        modeStatusEl.textContent = `Error: ${e.message}`;
      }
    });
  });

  void loadWorkspaceMode();

  return page;
}
