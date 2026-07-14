import { Resend } from "resend";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error({ to, subject, err: error }, "Failed to send email");
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (err) {
    logger.error({ to, subject, err }, "Email send exception");
    throw err;
  }
}
