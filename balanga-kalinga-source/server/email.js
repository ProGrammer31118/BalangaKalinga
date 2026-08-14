// Brevo transactional email helper. Env vars:
//   BREVO_API_KEY       (required to actually send)
//   BREVO_SENDER_EMAIL  (verified sender address)
//   BREVO_SENDER_NAME
// All send functions fail gracefully: they log and resolve, so the app still
// works even if email is misconfigured.

export async function sendEmail(to, subject, html) {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn('[email] BREVO_API_KEY not set — skipping email to', to);
    return false;
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'aestrada6060@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Balanga Kalinga';
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      console.warn(`[email] Brevo error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[email] send failed:', err.message);
    return false;
  }
}

function wrap(title, body) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="margin:0 0 12px">${title}</h2>
      ${body}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Balanga Kalinga · AI Wellness for Students</p>
    </div>`;
}

export function resetPasswordEmail(resetUrl) {
  const subject = 'Reset your Balanga Kalinga password';
  const html = wrap('Reset your password', `
    <p>We received a request to reset your Balanga Kalinga password.</p>
    <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#4338ca;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
    </p>
    <p style="color:#6b7280;font-size:13px">If you did not request this, you can safely ignore this email.</p>`);
  return { subject, html };
}

export function appointmentRequestEmail(studentName, counselorName, date, time, method) {
  const subject = 'Appointment request received — Balanga Kalinga';
  const html = wrap(`Hi ${studentName},`, `
    <p>Your counseling appointment request has been received.</p>
    <p style="font-size:15px"><strong>${counselorName}</strong></p>
    <p class="muted">${date} at ${time} · ${method}</p>
    <p>You will get a confirmation email once a counselor confirms your appointment.</p>`);
  return { subject, html };
}

export function appointmentDecisionEmail(studentName, counselorName, date, time, method, approved, note) {
  const subject = approved ? 'Appointment confirmed — Balanga Kalinga' : 'Appointment request update — Balanga Kalinga';
  const heading = approved ? 'Appointment confirmed' : 'Appointment not approved';
  const html = wrap(`${heading}`, `
    <p>${approved
      ? `Great news, ${studentName}! Your appointment has been confirmed.`
      : `Hi ${studentName}, unfortunately your appointment request could not be approved this time.`}</p>
    <p style="font-size:15px"><strong>${counselorName}</strong></p>
    <p>${date} at ${time} · ${method}</p>
    ${note ? `<p style="color:#6b7280">Note: ${note}</p>` : ''}
    ${approved
      ? '<p>Please arrive a few minutes early. You can reschedule anytime from the counseling page.</p>'
      : '<p>You are welcome to request a new slot that works better for you.</p>'}`);
  return { subject, html };
}
