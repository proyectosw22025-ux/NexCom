import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host:   env.MAIL_HOST,
  port:   env.MAIL_PORT,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
});

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
  } catch (err) {
    // En dev: si el mailer no está configurado, imprime en consola
    console.warn("[Mailer] No se pudo enviar el email (revisa MAIL_USER y MAIL_PASS en .env).");
    console.info(`[Mailer] Para: ${to} | Asunto: ${subject}`);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.FRONTEND_URL}/verificar-email?token=${token}`;
  console.info(`[Dev] URL verificación: ${url}`); // Siempre visible en logs dev
  await sendMail(
    to,
    "Verifica tu cuenta en NexCom",
    `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Bienvenido a NexCom</h2>
      <p>Haz clic en el botón para verificar tu cuenta:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">
        Verificar cuenta
      </a>
      <p style="color:#6b7280;font-size:14px;margin-top:24px">
        El enlace expira en 24 horas. Si no creaste una cuenta, ignora este email.
      </p>
    </div>
    `
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${env.FRONTEND_URL}/nueva-password?token=${token}`;
  console.info(`[Dev] URL reset password: ${url}`);
  await sendMail(
    to,
    "Restablece tu contraseña en NexCom",
    `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Restablecer contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none">
        Restablecer contraseña
      </a>
      <p style="color:#6b7280;font-size:14px;margin-top:24px">
        El enlace expira en 2 horas. Si no solicitaste esto, ignora este email.
      </p>
    </div>
    `
  );
}
