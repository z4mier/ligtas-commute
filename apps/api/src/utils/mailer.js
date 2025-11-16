// apps/api/src/utils/mailer.js
import nodemailer from "nodemailer";

export function mailer() {
  return nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.MAILTRAP_PORT) || 2525,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });
}

export async function sendOtpEmail(to, code) {
  const transport = mailer();

  // ✅ Simple layout like your second screenshot
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Your One-Time Password</title>
  </head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="padding:0 24px;">
            <tr>
              <td style="font-size:24px;font-weight:600;padding-bottom:16px;">
                Your One-Time Password
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;padding-bottom:16px;">
                Please use the code below to complete your verification process:
              </td>
            </tr>
            <tr>
              <td style="font-size:32px;font-weight:700;padding-bottom:16px;">
                ${code}
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#444;padding-bottom:32px;">
                This code will expire in <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#999;">
                © 2025 LigtasCommute. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const info = await transport.sendMail({
    from: process.env.MAILTRAP_FROM || "LigtasCommute <no-reply@ligtascommute.test>",
    to,
    subject: "Your OTP Code",
    html,
  });

  console.log("MAILTRAP OTP SENT:", info.messageId);
}
