import { Resend } from "resend";

let client: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** No-op (logs instead) when RESEND_API_KEY / EMAIL_FROM aren't configured,
 * so the rest of the app works fine before email is set up. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM not set, skipping:", opts.subject);
    return;
  }

  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
