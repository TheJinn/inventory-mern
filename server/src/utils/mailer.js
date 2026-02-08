import nodemailer from 'nodemailer';

function env(keyA, keyB){
  return process.env[keyA] ?? process.env[keyB];
}

export function makeTransport(){
  // Prefer SMTP_* variables, but keep backward compatibility with MAIL_*.
  const host = env('SMTP_HOST', 'MAIL_HOST');
  const port = env('SMTP_PORT', 'MAIL_PORT');
  const user = env('SMTP_USER', 'MAIL_USER');
  const pass = env('SMTP_PASS', 'MAIL_PASS');
  const secure = String(env('SMTP_SECURE', 'MAIL_SECURE') ?? '').toLowerCase() === 'true';

  if(!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure,
    auth: { user, pass }
  });
}

export async function sendOtpEmail({to, name, otp}){
  // Always print OTP to console for testing purposes.
  console.log(`[OTP] Email: ${to} | OTP: ${otp}`);

  const transport = makeTransport();
  if(!transport){
    console.warn('[OTP] SMTP not configured; email was not sent. Configure SMTP_* env vars to enable email delivery.');
    return;
  }

  const from = env('SMTP_FROM', 'MAIL_FROM') || 'no-reply@example.com';
  const subject = 'Your OTP Code';
  const text = `Hi${name ? ` ${name}` : ''},\n\nYour OTP is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial;line-height:1.45">
    <h2>OTP Verification</h2>
    <p>Hi${name ? ` ${name}` : ''},</p>
    <p>Your OTP is:</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</div>
    <p>This code expires in 10 minutes.</p>
    <p style="color:#667085">If you did not request this, you can ignore this email.</p>
  </body></html>`;

  try{
    await transport.sendMail({ from, to, subject, text, html });
  }catch(err){
    // Never crash the password-reset flow due to SMTP issues.
    // We still print OTP to the server console (above) and the route returns the OTP for browser-console testing.
    console.warn('[OTP] Failed to send email via SMTP:', err?.message || err);
  }
}
