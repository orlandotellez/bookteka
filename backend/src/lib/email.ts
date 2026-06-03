import { Resend } from "resend";
import { env } from "@/config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
