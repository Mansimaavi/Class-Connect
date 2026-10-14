const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export { escapeHtml };

/** Shared wrapper so every ClassConnect email looks the same. */
const layout = ({ title, body }) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#333;">
    <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:10px;padding:28px;">
      <div style="font-size:22px;font-weight:bold;color:#f97316;margin-bottom:18px;">ClassConnect</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:14px;">${escapeHtml(title)}</div>
      <div style="font-size:15px;line-height:1.5;">${body}</div>
      <div style="font-size:12px;color:#999;margin-top:28px;">
        You're receiving this email because of activity on your ClassConnect account.
        If this wasn't you, you can safely ignore it.
      </div>
    </div>
  </body>
</html>`;

export default layout;
