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

/** Registration / verification OTP (same as before, just more polished) */
export async function sendOtpEmail(to, code) {
  const transport = mailer();
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>LigtasCommute Verification Code</title>
  </head>
  <body style="margin:0;padding:32px;background:#0F1B2B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 18px 45px rgba(15,27,43,0.45);">
            <!-- Header -->
            <tr>
              <td style="background:#2078A8;padding:20px 24px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#FFFFFF;">LigtasCommute</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.92);margin-top:4px;">Verification code</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 24px 8px 24px;color:#111827;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 8px 0;">Hi there,</p>
                <p style="margin:0 0 12px 0;color:#374151;">
                  Use the code below to verify your LigtasCommute account.
                </p>

                <p style="margin:0 0 6px 0;color:#111827;font-weight:500;">Your verification code:</p>

                <div style="font-size:26px;font-weight:700;letter-spacing:8px;margin:10px 0 18px 0;padding:14px 16px;text-align:center;border-radius:10px;background:#0B132B;color:#FFFFFF;">
                  ${code}
                </div>

                <p style="margin:0 0 8px 0;color:#374151;">
                  This code will expire in <strong>10 minutes</strong>.
                </p>
                <p style="margin:0 0 18px 0;color:#4B5563;">
                  If you did not request this verification, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:12px 24px 18px 24px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:11px;line-height:1.5;">
                <p style="margin:10px 0 0 0;">
                  © ${year} LigtasCommute. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const text = `
LigtasCommute Verification

Use the code below to verify your LigtasCommute account:

${code}

This code will expire in 10 minutes.

If you did not request this verification, you can safely ignore this email.

© ${year} LigtasCommute. All rights reserved.
  `.trim();

  const info = await transport.sendMail({
    from:
      process.env.MAILTRAP_FROM ||
      "LigtasCommute <no-reply@ligtascommute.test>",
    to,
    subject: "Your LigtasCommute Verification Code",
    text,
    html,
  });

  console.log("MAILTRAP OTP SENT:", info.messageId);
}

/** Forgot-password email – OTP-style password reset */
export async function sendPasswordResetEmail(to, code, name) {
  const transport = mailer();
  const displayName = name || "Commuter";
  const year = new Date().getFullYear();

  const text = `
Hi ${displayName},

We received a request to reset the password for your LigtasCommute account.

Your password reset code is:

    ${code}

This code will expire in 10 minutes.

If you did not request a password reset, you can safely ignore this email.
Your password will stay the same.

— LigtasCommute Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>LigtasCommute Password Reset</title>
  </head>
  <body style="margin:0;padding:32px;background:#0F1B2B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 18px 45px rgba(15,27,43,0.45);">
            <!-- Header -->
            <tr>
              <td style="background:#2078A8;padding:20px 24px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#FFFFFF;">LigtasCommute</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.92);margin-top:4px;">Password reset code</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 24px 8px 24px;color:#111827;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 8px 0;">Hi <strong>${displayName}</strong>,</p>

                <p style="margin:0 0 12px 0;color:#374151;">
                  We received a request to reset the password for your LigtasCommute account.
                </p>

                <p style="margin:0 0 6px 0;color:#111827;font-weight:500;">
                  Your password reset code:
                </p>

                <div style="font-size:26px;font-weight:700;letter-spacing:8px;margin:10px 0 18px 0;padding:14px 16px;text-align:center;border-radius:10px;background:#2078A8;color:#FFFFFF;">
                  ${code}
                </div>

                <p style="margin:0 0 8px 0;color:#374151;">
                  This code will expire in <strong>10 minutes</strong>.
                </p>

                <p style="margin:0 0 18px 0;color:#4B5563;">
                  If you did not request a password reset, you can ignore this email and your password will remain unchanged.
                </p>

                <p style="margin:0 0 2px 0;color:#111827;">Stay safe,</p>
                <p style="margin:0 0 14px 0;color:#374151;">LigtasCommute Team</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:12px 24px 18px 24px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:11px;line-height:1.5;">
                <p style="margin:10px 0 0 0;">
                  © ${year} LigtasCommute. All rights reserved.
                </p>
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
    from:
      process.env.MAILTRAP_FROM ||
      "LigtasCommute <no-reply@ligtascommute.test>",
    to,
    subject: "LigtasCommute Password Reset Code",
    text,
    html,
  });

  console.log("MAILTRAP RESET SENT:", info.messageId);
}
