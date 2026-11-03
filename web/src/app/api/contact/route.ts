import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { escapeContactHtml, parseContact } from '../../../lib/contact';
import { readContactBody, reserveContactDelivery } from '../../../lib/contact-quota';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await readContactBody(req); } catch (error) {
      return NextResponse.json({ error: 'El contenido del formulario no es válido o supera el tamaño permitido.' },
        { status: error instanceof Error && error.message === 'TOO_LARGE' ? 413 : 400 });
    }
    const parsed = parseContact(body);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Revisá los campos: nombre de hasta 100 caracteres, email válido y mensaje de hasta 4000 caracteres.' },
        { status: 400 },
      );
    }
    const { name, email, reason, message } = parsed;
    const quota = await reserveContactDelivery();
    if (quota !== 'allowed') return NextResponse.json({ error: quota === 'limited'
      ? 'Se alcanzó el límite de envíos. Conservá tu mensaje e intentá más tarde.'
      : 'El contacto está temporalmente fuera de servicio. Conservá tu mensaje.' },
      { status: quota === 'limited' ? 429 : 503, headers: quota === 'limited' ? { 'Retry-After': '3600' } : {} });
    const safeName = escapeContactHtml(name), safeEmail = escapeContactHtml(email);
    const safeReason = escapeContactHtml(reason), safeMessage = escapeContactHtml(message);

    const recipient = process.env.CONTACT_EMAIL || 'info@plasticwho.com';
    const emailSubject = `[Plastic Who? Feedback] ${reason || 'Nuevo mensaje'} - ${name}`;

    const textContent = `
Nuevo mensaje desde Plastic Who? (plasticwho.com)
--------------------------------------------------
Nombre: ${name}
Email del remitente: ${email}
Motivo: ${reason || 'No especificado'}

Mensaje:
${message}

--------------------------------------------------
Enviado el: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
    `.trim();

    const htmlContent = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fbf9f5; border: 2px solid #191c18;">
        <div style="border-bottom: 2px solid #191c18; padding-bottom: 12px; margin-bottom: 16px;">
          <span style="font-family: monospace; font-size: 11px; font-weight: bold; background: #191c18; color: #f3efe6; padding: 4px 8px; text-transform: uppercase;">
            Plastic Who? · Feedback
          </span>
          <h2 style="margin: 12px 0 4px 0; color: #191c18;">Nuevo mensaje de contacto</h2>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; width: 120px; color: #5a5d55;">De:</td>
            <td style="padding: 6px 0; color: #191c18;">${safeName} (&lt;<a href="mailto:${safeEmail}">${safeEmail}</a>&gt;)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #5a5d55;">Motivo:</td>
            <td style="padding: 6px 0; color: #191c18;">${safeReason}</td>
          </tr>
        </table>

        <div style="background: #f3efe6; border-left: 4px solid #2b593f; padding: 16px; margin: 16px 0; font-size: 15px; line-height: 1.6; color: #191c18; white-space: pre-wrap;">
${safeMessage}
        </div>

        <p style="font-size: 12px; color: #8c887e; margin-top: 24px; border-top: 1px dashed #cfc6b4; padding-top: 12px;">
          Enviado a través de plasticwho.com · ${new Date().toLocaleDateString('es-AR')}
        </p>
      </div>
    `;

    // 1. Intento con Resend (si está configurada la API Key)
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Plastic Who <onboarding@resend.dev>',
          to: [recipient],
          reply_to: email,
          subject: emailSubject,
          text: textContent,
          html: htmlContent,
        }),
      });

      if (!resendRes.ok) throw new Error('Mail provider rejected request');
      const confirmation = await resendRes.json();
      if (typeof confirmation.id !== 'string' || !confirmation.id) throw new Error('Missing mail acceptance');

      return NextResponse.json({
        success: true,
        provider: 'resend',
        message: '¡Gracias! Tu mensaje fue enviado con éxito.',
      });
    }

    // 2. Intento con Hostinger SMTP / Nodemailer (si están las variables de entorno)
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // ej: smtp.hostinger.com
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT, // true para 465
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const confirmation = await transporter.sendMail({
        from: `"Plastic Who" <${process.env.SMTP_USER}>`,
        to: recipient,
        replyTo: email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      });
      if (!confirmation.accepted?.some((address: string | { address: string }) =>
        (typeof address === 'string' ? address : address.address).toLowerCase() === recipient.toLowerCase())) {
        throw new Error('Recipient not accepted');
      }

      return NextResponse.json({
        success: true,
        provider: 'smtp',
        message: '¡Gracias! Tu mensaje fue enviado con éxito.',
      });
    }

    return NextResponse.json({ error: 'El contacto no está disponible. Conservá tu mensaje e intentá más tarde.' }, { status: 503 });
  } catch {
    console.error('Contact mail delivery failed');
    return NextResponse.json(
      {
        error:
          'Ocurrió un error al enviar el mensaje. Por favor intentá nuevamente.',
      },
      { status: 502 },
    );
  }
}
