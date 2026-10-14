import layout, { escapeHtml } from "./layout.js";

export const passwordResetTemplate = (name, resetUrl) =>
  layout({
    title: "Reset your password",
    body: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your ClassConnect password. The link below is valid for 30 minutes.</p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(resetUrl)}"
           style="background:#f97316;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset password
        </a>
      </p>
      <p>If you didn't ask for this, you can ignore this email; your password won't change.</p>`,
  });

export const passwordUpdatedTemplate = (name, email) =>
  layout({
    title: "Your password was changed",
    body: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>The password for <strong>${escapeHtml(email)}</strong> was just changed and you've been signed out of your other devices.</p>
      <p>If this wasn't you, reset your password straight away.</p>`,
  });

export const twoFactorChangedTemplate = (name, enabled) =>
  layout({
    title: enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
    body: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Two-factor authentication was <strong>${enabled ? "turned on" : "turned off"}</strong> for your account.</p>
      <p>If you didn't make this change, reset your password and contact an administrator.</p>`,
  });
