import { Resend } from "resend";

let client: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** No-op (logs instead) when RESEND_API_KEY / EMAIL_FROM aren't configured,
 * so the rest of the app works fine before email is set up. Returns whether
 * it actually attempted the send, so callers that record "confirmation
 * sent" timestamps don't mark something as sent when it was really just
 * skipped. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM not set, skipping:", opts.subject);
    return false;
  }

  const result = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return true;
}
