import layout, { escapeHtml } from "./layout.js";

const otpTemplate = (otp, minutesValid = 10) =>
  layout({
    title: "Verify your email",
    body: `
      <p>Thanks for signing up for ClassConnect. Use this code to finish creating your account:</p>
      <p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${escapeHtml(otp)}</p>
      <p>The code expires in ${minutesValid} minutes.</p>`,
  });

export default otpTemplate;
