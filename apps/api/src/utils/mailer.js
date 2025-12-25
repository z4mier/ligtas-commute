// apps/api/src/utils/mailer.js
import nodemailer from "nodemailer";

export function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // Brevo usually uses 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/** Registration / verification OTP */
export async function sendOtpEmail(to, code) {
  const transport = mailer();
  const year = new Date().getFullYear();

  const subject = "Your LigtasCommute verification code";

  const text = `
LigtasCommute – Verification code

Your verification code is: ${code}

This code will expire in 10 minutes.
If you did not request this, you can safely ignore this email.

© ${year} LigtasCommute
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;padding:20px;">
      <h1 style="margin:0 0 6px 0;font-size:18px;font-weight:600;color:#111827;">
        LigtasCommute
      </h1>
      <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
        Verification code
      </p>

      <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">
        Use the code below to verify your LigtasCommute account:
      </p>

      <div style="margin:10px 0 14px 0;padding:12px 16px;border-radius:8px;background:#111827;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:6px;text-align:center;">
        ${code}
      </div>

      <p style="margin:0 0 6px 0;font-size:13px;color:#4b5563;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
        If you did not request this verification, you can ignore this email.
      </p>

      <p style="margin:20px 0 0 0;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;">
        © ${year} LigtasCommute. All rights reserved.
      </p>
    </div>
  </body>
</html>
  `.trim();

  const info = await transport.sendMail({
    from:
      process.env.SMTP_FROM ||
      "LigtasCommute <ligtascommute@gmail.com>",
    to,
    subject,
    text,
    html,
  });

  console.log("SMTP OTP SENT:", info.messageId);
}

/** Forgot-password email – OTP-style password reset */
export async function sendPasswordResetEmail(to, code, name) {
  const transport = mailer();
  const year = new Date().getFullYear();
  const displayName = name || "Commuter";

  const subject = "LigtasCommute password reset code";

  const text = `
Hi ${displayName},

We received a request to reset the password for your LigtasCommute account.

Your password reset code is: ${code}

This code will expire in 10 minutes.

If you did not request a password reset, you can safely ignore this email.

— LigtasCommute Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;padding:20px;">
      <h1 style="margin:0 0 6px 0;font-size:18px;font-weight:600;color:#111827;">
        LigtasCommute
      </h1>
      <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
        Password reset code
      </p>

      <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">
        Hi <strong>${displayName}</strong>, we received a request to reset the password for your LigtasCommute account.
      </p>

      <p style="margin:0 0 6px 0;font-size:13px;color:#111827;font-weight:500;">
        Your password reset code:
      </p>

      <div style="margin:10px 0 14px 0;padding:12px 16px;border-radius:8px;background:#111827;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:6px;text-align:center;">
        ${code}
      </div>

      <p style="margin:0 0 6px 0;font-size:13px;color:#4b5563;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
        If you did not request a password reset, you can ignore this email and your password will remain unchanged.
      </p>

      <p style="margin:20px 0 0 0;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;">
        © ${year} LigtasCommute. All rights reserved.
      </p>
    </div>
  </body>
</html>
  `.trim();

  const info = await transport.sendMail({
    from:
      process.env.SMTP_FROM ||
      "LigtasCommute <ligtascommute@gmail.com>",
    to,
    subject,
    text,
    html,
  });

  console.log("SMTP RESET SENT:", info.messageId);
}