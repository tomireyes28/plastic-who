import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, reason, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Por favor completá nombre, email y mensaje.' },
        { status: 400 },
      );
    }

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
            <td style="padding: 6px 0; color: #191c18;">${name} (&lt;<a href="mailto:${email}">${email}</a>&gt;)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #5a5d55;">Motivo:</td>
            <td style="padding: 6px 0; color: #191c18;">${reason || 'General'}</td>
          </tr>
        </table>

        <div style="background: #f3efe6; border-left: 4px solid #2b593f; padding: 16px; margin: 16px 0; font-size: 15px; line-height: 1.6; color: #191c18; white-space: pre-wrap;">
${message}
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

      if (!resendRes.ok) {
        const errorData = await resendRes.json();
        console.error('Error enviando con Resend:', errorData);
        throw new Error('Fallo al enviar correo con Resend');
      }

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
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Plastic Who" <${process.env.SMTP_USER}>`,
        to: recipient,
        replyTo: email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      });

      return NextResponse.json({
        success: true,
        provider: 'smtp',
        message: '¡Gracias! Tu mensaje fue enviado con éxito.',
      });
    }

    // 3. Fallback en desarrollo / sin credenciales aún cargadas
    console.log(
      '\n[PLASTIC WHO CONTACT FORM - SIMULADO (Aún sin RESEND_API_KEY ni SMTP)]',
    );
    console.log(textContent);
    console.log('----------------------------------------------------------\n');

    return NextResponse.json({
      success: true,
      simulated: true,
      message:
        '¡Mensaje recibido! (Simulación de desarrollo: las credenciales de email aún no están cargadas en el .env).',
    });
  } catch (error) {
    console.error('Error procesando formulario de contacto:', error);
    return NextResponse.json(
      {
        error:
          'Ocurrió un error al enviar el mensaje. Por favor intentá nuevamente.',
      },
      { status: 500 },
    );
  }
}
