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
