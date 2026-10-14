import nodemailer from "nodemailer";
import env from "../config/env.js";
import logger from "./logger.js";

let transporter;

const getTransporter = () => {
  if (!env.mail.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  }
  return transporter;
};

/**
 * Sends an email. With EMAIL_DELIVERY=log (the default in development and
 * tests) the message is written to the log instead, so flows like sign-up work
 * without an SMTP server.
 */
const sendMail = async ({ to, subject, html, text, devPreview }) => {
  if (env.mail.delivery === "log") {
    logger.info({ to, subject, preview: devPreview }, "email delivery is set to log; not sent");
    return { logged: true };
  }
  const transport = getTransporter();
  if (!transport) throw new Error("Email is not configured on the server (set MAIL_HOST or EMAIL_DELIVERY=log)");
  const info = await transport.sendMail({ from: env.mail.from, to, subject, html, text });
  logger.debug({ to, subject, messageId: info.messageId }, "email sent");
  return info;
};

export default sendMail;
