const fs = require('fs');
const path = require('path');

const fileContent = `// ============================================
// AI Agent — FinanzBot × OpenAI GPT-4o Mini (Omnipotent Mode)
// ============================================
import store from './store.js';
import { logAdminAction } from './auth.js';

const API_URL = '/api/openai/v1/chat/completions';
const MODEL   = 'gpt-4o-mini';
const MAX_HISTORY = 16;

// ─────────────────────────────────────────────
// System Prompt — Contexto Financiero Completo y Esquemas
// ─────────────────────────────────────────────
function buildSystemPrompt() {
  const accounts  = store.getAll('accounts');
  const banks     = store.getAll('banks');
  const cards     = store.getAll('cards');
  const extCards  = store.getAll('external_cards');
  const debts     = store.getAll('debts').filter(d => d.estado !== 'pagada' && !d.paid);
  const payables  = store.getAll('payables').filter(p => p.estado !== 'pagada');
  const subs      = store.getAll('subscriptions');
  const txs       = store.getAll('transactions').slice(-15);
  const goals     = store.getAll('goals');
  const settings  = store.getSettings();
  const currency  = settings.currency || 'DOP';
  const today     = new Date().toISOString().split('T')[0];

  const getBankName = (account) => {
    const bank = banks.find(b => b.id === account.bancoId);
    return bank?.nombre || account.banco || account.bank || 'Sin banco';
  };

  const getAccountBalance = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    let balance = parseFloat(account.saldoInicial) || 0;
    store.filter('transactions', t => t.cuentaId === accountId && t.estado !== 'hold').forEach(t => {
      if (t.tipo === 'ingreso') balance += parseFloat(t.monto) || 0;
      else if (t.tipo === 'gasto' || t.tipo === 'transferencia') balance -= parseFloat(t.monto) || 0;
    });
    return balance;
  };

  const fmtAccounts = accounts.length
    ? accounts.map(a => \`  • [ID:\${a.id}] \${a.nombre} (\${getBankName(a)}): \${getAccountBalance(a.id).toFixed(2)} \${currency}\`).join('\\n')
    : '  Sin cuentas registradas';

  const fmtCards = [...cards, ...extCards].length
    ? [...cards, ...extCards].map(c => \`  • [ID:\${c.id}] \${c.nombre}: límite \${c.limite||c.limiteCredito||0}, usado \${c.saldoUsado||0}\`).join('\\n')
    : '  Sin tarjetas';

  const fmtDebts = debts.length
    ? debts.map(d => \`  • [ID:\${d.id}] \${d.descripcion||d.acreedor}: \${d.saldoPendiente||0} \${currency} pend.\`).join('\\n')
    : '  Sin deudas activas';

  return \`Eres FinanzBot, el asistente financiero omnipotente de FinanzApp. 
Hoy es: \${today}. Moneda del usuario: \${currency}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUACIÓN FINANCIERA ACTUAL (Muestra selecta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 CUENTAS BANCARIAS:
\${fmtAccounts}

💳 TARJETAS PERSONALES Y EXTERNAS:
\${fmtCards}

🔴 DEUDAS:
\${fmtDebts}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PODER OPERATIVO (ESTRICTAMENTE CONFIDENCIAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tienes acceso TOTAL a modificar CUALQUIER base de datos de la app usando la herramienta "execute_app_action".
Puedes leer, crear, actualizar o borrar información en las colecciones de la app: 'accounts', 'banks', 'cards', 'external_cards', 'transactions', 'debts', 'payables', 'receivables', 'subscriptions', 'goals', 'clients', 'categories', 'notes'.

ESQUEMAS BÁSICOS (Guía para payload):
- transactions: {tipo: 'gasto'|'ingreso', monto: num, descripcion: string, fecha: 'YYYY-MM-DD', cuentaId: str|null, tarjetaId: str|null, tarjetaExternaId: str|null, estado: 'activo'|'hold', categoriaId: str}
- debts / payables / receivables: {descripcion: str, acreedor: str, montoTotal: num, saldoPendiente: num, estado: 'pendiente'|'pagada', cuentaId: str|null}
- subscriptions: {nombre: str, monto: num, frecuencia: 'mes'|'ano', proxCobro: 'YYYY-MM-DD', cuentaId: str}
- accounts: {nombre: str, bancoId: str, saldoInicial: num}
- external_cards: {nombre: str, titular: str, banco: str, limiteCredito: num, saldoUsado: num}

INSTRUCCIONES DIRECTAS:
1. Si el usuario te pide crear una transacción y NO provee cuenta o banco, usa execute_app_action con collection='transactions', action='create' y asigna \`estado: 'hold'\` y \`cuentaId: null\`. Esto no afectará balances. Exígele al usuario que asigne una cuenta para confirmarla.
2. Si pide pagar/crear deuda con una Tarjeta Externa, usa \`tarjetaExternaId\`.
3. Para ACCIONES DESTRUCTIVAS O SENSIBLES (eliminar registros grandes, pagar totalmente deudas sin fuente, etc) DEBES usar primero la herramienta "ask_confirmation" y esperar a que el usuario te responda afirmativamente antes de aplicar el execute_app_action. Para crear o editar, hazlo directo y confirma.
4. Cuando devuelvas mensaje hablado, DEBES confirmar explícitamente lo que mutaste.
\`;
}

// ─────────────────────────────────────────────
// OpenAI Tools
// ─────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'execute_app_action',
      description: 'Ejecuta una operación CRUD directa en cualquier módulo de la aplicación.',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Nombre de la colección a leer/modificar (ej. transactions, debts, accounts, external_cards, subscriptions)' },
          action:     { type: 'string', enum: ['create', 'update', 'delete', 'read'], description: 'La operación a realizar. Read buscará registros en la colección que contengan text match.' },
          targetId:   { type: 'string', description: 'ID del documento (requerido para update o delete)' },
          payload:    { type: 'string', description: 'JSON string de los campos a mutar o crear. Para read, el texto de búsqueda. Ej: "{\\"monto\\": 500, \\"estado\\": \\"activo\\"}"' }
        },
        required: ['collection', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_confirmation',
      description: 'Detiene el proceso y pide autorización explícita al usuario antes de proceder a una acción sensible o confusa.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Explicación conversacional de qué harás y la pregunta de confirmación' }
        },
        required: ['reason']
      }
    }
  }
];

// ─────────────────────────────────────────────
// Execute Action — Applies to Store + Audits
// ─────────────────────────────────────────────
export function executeAction(toolCall) {
  if (!toolCall) return { success: false };

  const sessionStr = sessionStorage.getItem('finanzapp_session') || '{}';
  const userId = JSON.parse(sessionStr).userId || 'system';

  if (toolCall.type === 'ask_confirmation') {
    return { success: true, message: toolCall.data.reason, askedConfirmation: true };
  }

  if (toolCall.type === 'execute_app_action') {
    const { collection, action, targetId, payload } = toolCall.data;
    
    // Si la AI intentó hacer un query
    if (action === 'read') {
      const records = store.getAll(collection);
      let match = records;
      if (payload) {
        match = records.filter(r => JSON.stringify(r).toLowerCase().includes(payload.toLowerCase()));
      }
      return { success: true, isQuery: true, data: match.slice(0,5), message: \`Búsqueda exitosa, revisa el contexto.\` };
    }

    let dataObj = {};
    try { dataObj = payload ? JSON.parse(payload) : {}; } catch(e) {}

    // Force IA identification
    dataObj._aiModified = true;
    dataObj._aiModifiedAt = new Date().toISOString();

    try {
      if (action === 'create') {
        const id = \`\${collection.substring(0,2)}_\${Date.now()}_\${Math.random().toString(36).substr(2,6)}\`;
        const record = { id, ...dataObj };
        store.add(collection, record);
        logAdminAction(userId, 'SYSTEM', \`[IA] Creación en \${collection}\`, JSON.stringify(record));
        return { success: true, isMutation: true, id, message: \`✅ He creado el registro id:\${id} en \${collection}.\` };
      } 
      else if (action === 'update' && targetId) {
        store.update(collection, targetId, dataObj);
        logAdminAction(userId, 'SYSTEM', \`[IA] Refactor (\${targetId}) en \${collection}\`, JSON.stringify(dataObj));
        return { success: true, isMutation: true, message: \`✅ He actualizado el registro en \${collection}.\` };
      }
      else if (action === 'delete' && targetId) {
        store.remove(collection, targetId);
        logAdminAction(userId, 'SYSTEM', \`[IA] Borrado (\${targetId}) en \${collection}\`, '');
        return { success: true, isMutation: true, message: \`✅ He borrado el registro en \${collection}.\` };
      }
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Acción no reconocida' };
}

// ─────────────────────────────────────────────
// Send Message
// ─────────────────────────────────────────────
export async function sendMessage(history, userMessage) {
  const apiKey = store.getSetting('openaiKey', '');
  if (!apiKey) throw new Error('No hay API Key configurada. Ve a Configuración → FinanzBot para agregarla.');

  const trimmedHistory = history.slice(-MAX_HISTORY);
  
  const aiMessages = [
    { role: 'system', content: buildSystemPrompt() },
    ...trimmedHistory,
    { role: 'user', content: userMessage }
  ];

  let response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
    body: JSON.stringify({
      model: MODEL,
      messages: aiMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 600,
      temperature: 0.65
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || \`Error HTTP \${response.status}\`);
  }

  let data = await response.json();
  let choice = data.choices[0];
  let message = '';
  let actionRes = null;

  // Si OpenAI decide que necesita usar un tool (búsqueda o ejecutar en el store)
  if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length > 0) {
    const toolCallId = choice.message.tool_calls[0].id;
    const toolCall = choice.message.tool_calls[0];
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const actionPayload = { type: toolCall.function.name, data: args };
      
      const execResult = executeAction(actionPayload);
      
      // Si la IA hizo una consulta 'read', debemos volver a llamarla pasando los resultados en el contexto
      if (execResult.success && execResult.isQuery) {
        aiMessages.push({
          role: 'assistant',
          tool_calls: [choice.message.tool_calls[0]]
        });
        aiMessages.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(execResult.data)
        });
        
        // Llamada de retorno a OpenAI con los datos listos
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
          body: JSON.stringify({
            model: MODEL,
            messages: aiMessages,
            tools: TOOLS,
            max_tokens: 600,
            temperature: 0.65
          })
        });
        data = await response.json();
        choice = data.choices[0];
        message = choice.message.content || '✅ Consulta procesada exitosamente.';
      } 
      // Si fue una mutación o pedir confirmación, ya le devolvemos eso al usuario
      else {
        if (execResult.askedConfirmation) {
          message = execResult.message;
        } else if (execResult.isMutation) {
          message = choice.message.content || execResult.message;
        } else {
          message = \`Acción procesada con éxito.\`;
        }
      }
      
      actionRes = actionPayload;

    } catch (e) {
      console.error(e);
      message = 'Detecté una acción o búsqueda pero falló la redención de datos internamente.';
    }
  } else {
    message = choice.message.content || 'De acuerdo.';
  }

  return { message, action: actionRes };
}

// Limpiar la referencia fallback si se mantenia
export function extractTransactionFromText() {} 
`;

fs.writeFileSync(path.join(__dirname, 'src/ai-agent.js'), fileContent, 'utf8');
console.log('ai-agent.js ready');
