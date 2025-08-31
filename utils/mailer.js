const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_USER, EMAIL_PASS } = process.env;

  // Prefer explicit SMTP settings; fallback to Gmail if EMAIL_USER/PASS are set
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  if (EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  }

  throw new Error('No SMTP configuration found. Set SMTP_* or EMAIL_USER/EMAIL_PASS');
}

const transporter = createTransport();

async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || process.env.EMAIL_USER;
  const info = await transporter.sendMail({ from, to, subject, html, text });
  return info;
}

module.exports = { sendMail };
