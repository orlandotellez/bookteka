const VERIFICATION_SUBJECT = "Bookteka: código de verificación";

export function verificationEmailTemplate({ code }: { code: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: VERIFICATION_SUBJECT,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fcf5ee; color: #38332e; border-radius: 12px;">
        <h1 style="margin: 0 0 12px; font-size: 20px;">Verificá tu correo</h1>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5;">
          Usá este código para confirmar tu dirección en Bookteka.
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #fff; border-radius: 8px;">
          ${code}
        </div>
        <p style="margin: 20px 0 0; font-size: 13px; color: #7e7367;">
          El código vence en 15 minutos. Si no pediste esta verificación, ignorá este correo.
        </p>
      </div>
    `,
  };
}