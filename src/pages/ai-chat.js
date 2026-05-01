// ============================================
// AI Chat — FinanzBot Chat Drawer Component
// ============================================
import { sendMessage, executeAction } from '../ai-agent.js';
import { icon } from '../icons.js';
import store from '../store.js';
import { showToast } from '../components.js';

const SUGGESTIONS = [
  '\ud83d\udcb0 Gast\u00e9 RD$500 en comida hoy',
  '\ud83d\udcca \u00bfCu\u00e1l es mi balance total?',
  '\ud83d\udcc4 \u00bfQu\u00e9 tengo pendiente?',
  '\ud83d\udca1 Dame una estrategia de ahorro',
  '\ud83e\udd16 Registra un ingreso de cliente',
];

export function initAIChat() {
  // Inject CSS
  if (!document.querySelector('link[data-chat-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/chat.css';
    link.dataset.chatCss = '1';
    document.head.appendChild(link);
  }

  // In-memory chat history (no persisted, no extra API cost on reload)
  let chatHistory = [];
  let isLoading = false;
  let pendingAction = null;

  // ---- FAB Button ----
  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.id = 'ai-fab';
  fab.title = 'FinanzBot — Asistente IA';
  fab.innerHTML = `<div class="ai-fab-pulse"></div><span style="font-size:1.4rem">🤖</span>`;
  document.body.appendChild(fab);

  // ---- Chat Drawer ----
  const drawer = document.createElement('div');
  drawer.className = 'chat-drawer';
  drawer.id = 'chat-drawer';
  drawer.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-avatar">🤖</div>
      <div class="chat-header-info">
        <strong>FinanzBot</strong>
        <span>● En línea — GPT-4o Mini</span>
      </div>
      <button class="chat-close" id="chat-close" title="Ocultar chat">${icon('close', 18)}</button>
    </div>

    <div class="chat-messages" id="chat-messages">
    <div class="chat-bubble bot">
        \u00a1Hola! Soy <strong>FinanzBot</strong>, tu asistente financiero. \ud83d\udcbc<br><br>
        Puedo <strong>registrar transacciones</strong> con solo describirlas, darte estrategias para pagar deudas, analizar tu situaci\u00f3n financiera y mucho m\u00e1s.<br><br>
        Si no especificas banco o cuenta, guardar\u00e9 la transacci\u00f3n en <strong>HOLD</strong> (visible en Transacciones con badge amarillo) y te preguntar\u00e9 d\u00f3nde cargarla.<br><br>
        \u00bfEn qu\u00e9 te ayudo hoy?
      </div>
    </div>

    <div class="chat-suggestions" id="chat-suggestions">
      ${SUGGESTIONS.map(s => `<button class="chat-suggestion">${s}</button>`).join('')}
    </div>

    <div class="chat-input-area">
      <textarea class="chat-input" id="chat-input" rows="1" placeholder="Escribe aquí... ej: Gasté $1,500 en gasolina"></textarea>
      <button class="chat-send" id="chat-send">${icon('send', 16)}</button>
    </div>
  `;
  document.body.appendChild(drawer);

  // ---- Refs ----
  const messagesEl  = drawer.querySelector('#chat-messages');
  const inputEl     = drawer.querySelector('#chat-input');
  const sendBtn     = drawer.querySelector('#chat-send');
  const closeBtn    = drawer.querySelector('#chat-close');
  const suggestionsEl = drawer.querySelector('#chat-suggestions');

  // ---- Toggle ----
  function openChat() {
    drawer.classList.add('open');
    fab.style.display = 'none';
    inputEl.focus();
  }
  function hideChat() {
    drawer.classList.remove('open');
    fab.style.display = 'flex';
  }

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', hideChat);

  // ---- Suggestions click ----
  suggestionsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-suggestion');
    if (!chip) return;
    // Strip emoji prefix
    const text = chip.textContent.replace(/^[\u{1F000}-\u{1FFFF}]\s*/u, '').trim();
    inputEl.value = text;
    send();
  });

  // ---- Auto-resize textarea ----
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // ---- Send on Enter (Shift+Enter = new line) ----
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener('click', send);

  // ---- Helpers ----
  function appendBubble(role, html, extraClass = '') {
    const div = document.createElement('div');
    div.className = `chat-bubble ${role} ${extraClass}`;
    div.innerHTML = html;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-bubble bot typing';
    el.id = 'typing-indicator';
    el.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  }

  function showActionCard(action, botMessage) {
    // Destructuring defensivo — data puede venir en root o en .data
    const data = (action.data && typeof action.data === 'object') ? action.data : action;
    const tipo        = data.tipo        || 'gasto';
    const monto       = data.monto       || 0;
    const descripcion = data.descripcion || data.description || '';
    const fecha       = data.fecha       || data.date || new Date().toISOString().split('T')[0];
    const cuentaId    = data.cuentaId    || null;
    const tarjetaId   = data.tarjetaId   || null;
    const categoria   = data.categoria   || '';

    // Asegurar que action.data esté normalizado para executeAction
    action.data = { tipo, monto, descripcion, fecha, cuentaId, tarjetaId, categoria };

    // Lookup account/card name
    let cuentaName = 'Sin cuenta asignada — quedará en Hold';
    if (cuentaId) {
      const acc = store.getById('accounts', cuentaId);
      if (acc) cuentaName = acc.nombre || acc.name || cuentaId;
    }
    if (tarjetaId) {
      const allCards = [...store.getAll('cards'), ...store.getAll('external_cards')];
      const foundCard = allCards.find(c => c.id === tarjetaId);
      if (foundCard) cuentaName = `Tarjeta: ${foundCard.nombre || foundCard.name}`;
    }

    const tipoLabel = { gasto: '🔴 Gasto', ingreso: '🟢 Ingreso', transferencia: '🔵 Transferencia' }[tipo] || tipo;
    const settings = store.getSettings();
    const currency = settings.currency || 'DOP';

    const card = document.createElement('div');
    card.className = 'action-card';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:1rem">📋</span>
        <span style="font-weight:700;font-size:0.85rem;color:var(--accent-primary)">TRANSACCIÓN DETECTADA</span>
        <span style="margin-left:auto;font-size:1.1rem">${tipoLabel}</span>
        <span style="font-weight:800;font-size:1.1rem;color:${tipo==='ingreso'?'var(--color-income)':'var(--color-expense)'}">${parseFloat(monto).toLocaleString('es-DO')} ${currency}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.8rem;margin-bottom:10px">
        <span style="color:var(--text-muted)">Descripción</span><span>${descripcion}</span>
        <span style="color:var(--text-muted)">Cuenta</span><span>${cuentaName}</span>
        <span style="color:var(--text-muted)">Fecha</span><span>${fecha}</span>
        ${categoria ? `<span style="color:var(--text-muted)">Categoría</span><span>${categoria}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" id="action-cancel" style="flex:1;padding:6px">✗ Cancelar</button>
        <button class="btn btn-primary" id="action-confirm" style="flex:2;padding:6px">✓ Confirmar</button>
      </div>
    `;
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    pendingAction = action;

    card.querySelector('#action-confirm').addEventListener('click', () => {
      const success = executeAction(pendingAction);
      const sinCuenta = !pendingAction.data.cuentaId && !pendingAction.data.tarjetaId;
      if (success) {
        card.remove();
        if (sinCuenta) {
          appendBubble('bot', '⏳ Guardada en <strong>Transacciones → Hold</strong>. Redirigiendo...');
          showToast('info', '⏳ En Hold', 'Asígnala desde Transacciones');
          // Navegar automáticamente a Transacciones después de 1.2s
          setTimeout(() => {
            window.location.hash = '/transactions';
          }, 1200);
        } else {
          appendBubble('bot', '✅ ¡Transacción registrada exitosamente!');
          showToast('success', 'Transacción registrada', `${descripcion} — ${monto} ${currency}`);
        }
      } else {
        appendBubble('bot', '❌ No pude registrar la transacción. Por favor, intenta de nuevo.');
      }
      pendingAction = null;
    });

    card.querySelector('#action-cancel').addEventListener('click', () => {
      card.remove();
      appendBubble('bot', 'Entendido, cancelé el registro. ¿Quieres que lo ajuste o hay algo más en lo que te pueda ayudar?');
      pendingAction = null;
    });
  }

  // ---- Core send function ----
  async function send() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    // Check API key
    const apiKey = store.getSetting('openaiKey', '');
    if (!apiKey) {
      appendBubble('bot', '⚠️ No has configurado tu API Key de OpenAI. Ve a <strong>Configuración → FinanzBot</strong> para agregarla y activarme.');
      return;
    }

    // Render user bubble
    appendBubble('user', text);
    inputEl.value = '';
    inputEl.style.height = 'auto';

    // Hide suggestions after first message
    suggestionsEl.style.display = 'none';

    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const { message, action } = await sendMessage(chatHistory, text);

      chatHistory.push({ role: 'user', content: text });
      if (message) chatHistory.push({ role: 'assistant', content: message });

      hideTyping();
      if (message) appendBubble('bot', message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));

      if (action) {
        // Note: The action was ALREADY executed natively inside ai-agent.js to ensure the AI gets the context if it was a read. 
        // We only use that 'action' object here to trigger UI feedback toasts, not to re-execute it.
        const d = action.data || {};
        const currency = store.getSettings()?.currency || 'DOP';

        const result = action.result || {};
        const isTransaction = action.type === 'execute_app_action' && d.collection === 'transactions';
        const isHold = d.payload && d.payload.includes('"estado":"hold"');

        if (isTransaction && d.action === 'create') {
          if (isHold) {
            // Show account assignment buttons inline
            const accounts = store.getAll('accounts').filter(a => a.activa !== false);
            const cards    = store.getAll('cards').filter(c => c.activa !== false);
            if (accounts.length > 0 || cards.length > 0) {
              const btnsDiv = document.createElement('div');
              btnsDiv.className = 'chat-bubble bot';
              btnsDiv.style.cssText = 'padding:10px 14px';
              btnsDiv.innerHTML = `
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Asigna una cuenta para confirmar:</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${accounts.map(a => `<button class="btn btn-secondary btn-sm hold-acc-btn" style="font-size:0.78rem" data-acc-id="${a.id}" data-tx-id="${result.id}">🏦 ${a.nombre}</button>`).join('')}
                  ${cards.map(c => `<button class="btn btn-secondary btn-sm hold-acc-btn" style="font-size:0.78rem" data-card-id="${c.id}" data-tx-id="${result.id}">💳 ${c.nombre}</button>`).join('')}
                  <button class="btn btn-ghost btn-sm" id="skip-hold-btn" style="font-size:0.78rem">⏳ Dejar en Hold por ahora</button>
                </div>
              `;
              messagesEl.appendChild(btnsDiv);
              messagesEl.scrollTop = messagesEl.scrollHeight;

              // Account btn click
              btnsDiv.querySelectorAll('.hold-acc-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  const txId    = btn.dataset.txId;
                  const accId   = btn.dataset.accId   || null;
                  const cardId  = btn.dataset.cardId  || null;
                  
                  // Patch the target transaction directly using store update
                  const targetTx = store.getById('transactions', txId);
                  if (targetTx) {
                      store.update('transactions', txId, { 
                          cuentaId: accId, 
                          tarjetaId: cardId, 
                          estado: 'activo'
                      });
                      const accName = accId
                        ? (store.getById('accounts', accId)?.nombre || accId)
                        : (store.getById('cards', cardId)?.nombre   || cardId);
                      btnsDiv.remove();
                      appendBubble('bot', `✅ Confirmado en <strong>${accName}</strong>.`);
                      showToast('success', '✅ Confirmado', `Cargado a ${accName}`);
                  } else {
                      appendBubble('bot', '❌ No pude asignar esa cuenta. Inténtalo desde Transacciones.');
                  }
                });
              });

              btnsDiv.querySelector('#skip-hold-btn')?.addEventListener('click', () => {
                btnsDiv.remove();
                appendBubble('bot', '⏳ La transacción queda en <strong>HOLD</strong> en tu lista de Transacciones. Puedes asignarla cuando quieras.');
              });
            }
            showToast('info', '⏳ En Hold', 'Asigna una cuenta desde el chat o desde Transacciones');

          } else {
            // Confirmed immediately
            showToast('success', '✅ Registrado', 'Transacción aplicada con éxito.');
          }

        } else if (action.type === 'complete_hold_transaction') {
          if (result.success) {
            showToast('success', '\u2705 Transacci\u00f3n confirmada', 'Saldo actualizado');
          }
        } else if (action.type === 'update_transaction') {
          if (result.success) {
            showToast('success', '\u2705 Actualizado', 'Transacci\u00f3n modificada');
          }
        }
      }

    } catch (err) {
      hideTyping();
      appendBubble('bot', `❌ <strong>Error:</strong> ${err.message}`);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }
}
