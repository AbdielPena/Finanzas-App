// ============================================
// Email Service — wrapper sobre nodemailer
// Usa SMTP del hosting (Banahosting/cPanel)
// En dev, si no hay SMTP configurado, loguea a consola
// ============================================
import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.mail.host) {
    console.warn('[email] SMTP no configurado — emails se logueran a consola');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user
      ? { user: config.mail.user, pass: config.mail.pass }
      : undefined,
  });
  return transporter;
}

async function send({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('\n[email-mock]', { to, subject });
    console.log(text || html);
    return { mocked: true };
  }
  const info = await t.sendMail({
    from: config.mail.from,
    to, subject, html, text,
  });
  return { messageId: info.messageId };
}

// ---------- Templates ----------
function baseTemplate(title, body) {
  return `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f5f5;color:#333">
  <div style="background:white;padding:32px;border-radius:12px">
    <h1 style="margin:0 0 16px;color:#6c63ff">${config.appName}</h1>
    <h2 style="margin:0 0 12px">${title}</h2>
    ${body}
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee" />
    <p style="font-size:12px;color:#999;margin:0">Si no solicitaste este email, ignoralo.</p>
  </div>
</body></html>`;
}

export async function sendVerificationEmail(toEmail, token) {
  const url = `${config.appUrl}/#/verify-email?token=${encodeURIComponent(token)}`;
  return send({
    to: toEmail,
    subject: `[${config.appName}] Verifica tu email`,
    html: baseTemplate('Confirma tu correo', `
      <p>Haz click en el siguiente enlace para verificar tu cuenta:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:white;text-decoration:none;border-radius:8px">Verificar email</a></p>
      <p style="font-size:12px;color:#666">O copia este enlace: ${url}</p>
      <p style="font-size:12px;color:#666">Expira en 24 horas.</p>
    `),
    text: `Verifica tu email visitando: ${url}`,
  });
}

export async function sendNotificationEmail(toEmail, { titulo, mensaje, accion = null }) {
  const actionHtml = accion ? `
    <p style="margin:20px 0">
      <a href="${accion.url}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:white;text-decoration:none;border-radius:8px;font-weight:600">${accion.label}</a>
    </p>
  ` : '';
  return send({
    to: toEmail,
    subject: `[${config.appName}] ${titulo}`,
    html: baseTemplate(titulo, `<p>${mensaje}</p>${actionHtml}`),
    text: `${titulo}\n\n${mensaje}${accion ? `\n\n${accion.label}: ${accion.url}` : ''}`,
  });
}

export async function sendDailySummaryEmail(toEmail, { nombre, summary }) {
  const {
    saldo_total = 0,
    ingresos_mes = 0,
    gastos_mes = 0,
    proximos_pagos = [],
    alertas = [],
  } = summary;

  const fmt = (n) => `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const proximosHtml = proximos_pagos.length
    ? `<h3 style="margin-top:24px">Próximos pagos</h3><ul style="padding-left:20px">${proximos_pagos.map(p => `<li>${p.descripcion} — ${fmt(p.monto)} (${p.fecha})</li>`).join('')}</ul>`
    : '';

  const alertasHtml = alertas.length
    ? `<h3 style="margin-top:24px;color:#e85a5a">⚠️ Alertas</h3><ul style="padding-left:20px">${alertas.map(a => `<li>${a}</li>`).join('')}</ul>`
    : '';

  return send({
    to: toEmail,
    subject: `[${config.appName}] Resumen diario — ${new Date().toLocaleDateString('es-DO')}`,
    html: baseTemplate(`Hola ${nombre} 👋`, `
      <p>Aquí va el resumen de hoy:</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span><strong>Saldo total:</strong></span>
          <span style="color:#22c55e;font-weight:600">${fmt(saldo_total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span>Ingresos del mes:</span>
          <span style="color:#22c55e">${fmt(ingresos_mes)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>Gastos del mes:</span>
          <span style="color:#ef4444">${fmt(gastos_mes)}</span>
        </div>
      </div>
      ${proximosHtml}
      ${alertasHtml}
      <p style="margin-top:24px">
        <a href="${config.appUrl}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:white;text-decoration:none;border-radius:8px">Abrir FinanzApp</a>
      </p>
    `),
    text: `Resumen diario\nSaldo: ${fmt(saldo_total)}\nIngresos: ${fmt(ingresos_mes)}\nGastos: ${fmt(gastos_mes)}`,
  });
}

export async function sendWelcomeEmail(toEmail, { nombre, workspaceNombre }) {
  return send({
    to: toEmail,
    subject: `[${config.appName}] Bienvenido ${nombre} 👋`,
    html: baseTemplate(`Bienvenido a ${config.appName}`, `
      <p>Hola ${nombre},</p>
      <p>Tu cuenta fue creada correctamente. Tu workspace inicial es <strong>${workspaceNombre}</strong>.</p>
      <p>Algunas cosas que puedes hacer ahora:</p>
      <ul>
        <li>Registrar tu primer banco y cuentas</li>
        <li>Anotar tus suscripciones recurrentes</li>
        <li>Configurar tu porcentaje de ahorro/diezmo</li>
        <li>Activar el resumen diario por email</li>
      </ul>
      <p style="margin-top:20px">
        <a href="${config.appUrl}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:white;text-decoration:none;border-radius:8px;font-weight:600">Abrir FinanzApp</a>
      </p>
    `),
    text: `Bienvenido a ${config.appName}, ${nombre}! Tu workspace ${workspaceNombre} esta listo. Abre la app: ${config.appUrl}`,
  });
}

export async function sendPasswordChangedEmail(toEmail, { nombre, ip }) {
  return send({
    to: toEmail,
    subject: `[${config.appName}] Tu contraseña fue cambiada`,
    html: baseTemplate('Contraseña actualizada', `
      <p>Hola ${nombre},</p>
      <p>Tu contraseña fue cambiada exitosamente. Todas tus sesiones activas fueron cerradas por seguridad.</p>
      <p style="font-size:0.85rem;color:#666">IP del cambio: ${ip || 'desconocida'} · ${new Date().toLocaleString('es-DO')}</p>
      <p style="background:#fff3cd;padding:12px;border-radius:8px;color:#856404;font-size:0.9rem">
        ⚠️ Si NO fuiste tú, contacta soporte y resetea tu contraseña inmediatamente.
      </p>
    `),
    text: `Tu contrasena en ${config.appName} fue cambiada. Si no fuiste tu, resetea tu contrasena.`,
  });
}

export async function sendPasswordResetEmail(toEmail, token) {
  const url = `${config.appUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
  return send({
    to: toEmail,
    subject: `[${config.appName}] Restablece tu contrasena`,
    html: baseTemplate('Restablecer contrasena', `
      <p>Recibimos una solicitud para restablecer tu contrasena. Haz click abajo:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:white;text-decoration:none;border-radius:8px">Restablecer contrasena</a></p>
      <p style="font-size:12px;color:#666">O copia este enlace: ${url}</p>
      <p style="font-size:12px;color:#666">Expira en 1 hora. Si no fuiste tu, ignora este email.</p>
    `),
    text: `Restablece tu contrasena en: ${url}`,
  });
}

export default { send, sendVerificationEmail, sendPasswordResetEmail };
