import nodemailer from "nodemailer";

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.MAIL_FROM || "Portfolio Simulator <no-reply@localhost>";
const TTL = Number(process.env.CODE_TTL_MIN || 10);

/**
 * Send a 6-digit verification code. In development (or when SMTP is not
 * configured) the code is also logged to the server console so the flow can be
 * tested without a live inbox.
 */
export async function sendCode(email, code) {
  if (!transport || process.env.NODE_ENV !== "production") {
    console.log(`[email] verification code for ${email}: ${code}`);
  }
  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[email] SMTP not configured — code was not emailed.");
    }
    return;
  }
  await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Your Portfolio Simulator verification code",
    text: `Your verification code is ${code}. It expires in ${TTL} minutes.`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif">
        <p>Your Portfolio Simulator verification code is:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:12px 0">${code}</p>
        <p style="color:#555">It expires in ${TTL} minutes. If you didn't request this, you can ignore this email.</p>
      </div>`,
  });
}
