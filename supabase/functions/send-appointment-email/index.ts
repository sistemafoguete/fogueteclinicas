import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AppointmentEmailRequest {
  clientEmail: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  professionalName: string;
  appointmentType: string;
  notes?: string;
  unit?: string;
}

const getUnitInfo = (unit: string) => {
  switch (unit) {
    case 'madre':
      return { name: 'Clínica Social Madre Clélia', color: '#3b82f6' };
    case 'floresta':
      return { name: 'Neuroavaliação Floresta', color: '#10b981' };
    case 'atendimento_floresta':
      return { name: 'Atendimento Floresta', color: '#8b5cf6' };
    default:
      return { name: 'Fundação Dom Bosco', color: '#3b82f6' };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientEmail, 
      clientName, 
      appointmentDate, 
      appointmentTime,
      professionalName,
      appointmentType,
      notes,
      unit = 'madre'
    }: AppointmentEmailRequest = await req.json();

    console.log("Enviando email de confirmação para:", clientEmail);

    const unitInfo = getUnitInfo(unit);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${unitInfo.color}, ${unitInfo.color}dd); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                ✅ Agendamento Confirmado
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                ${unitInfo.name}
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                Olá, <strong>${clientName}</strong>!
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
                Seu atendimento foi agendado com sucesso. Confira os detalhes abaixo:
              </p>
              
              <!-- Appointment Details Card -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🕐 Horário:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">👨‍⚕️ Profissional:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${professionalName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📋 Tipo:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${appointmentType}</td>
                  </tr>
                </table>
              </div>
              
              ${notes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 13px; margin: 0;">
                  <strong>📝 Observações:</strong><br>
                  ${notes}
                </p>
              </div>
              ` : ''}
              
              <!-- Reminder -->
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="color: #1e40af; font-size: 13px; margin: 0;">
                  💡 <strong>Lembrete:</strong> Por favor, chegue com 10 minutos de antecedência.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                Fundação Dom Bosco
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Este é um email automático. Por favor, não responda.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: "Fundação Dom Bosco <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Agendamento Confirmado - ${appointmentDate} às ${appointmentTime}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Erro ao enviar email:", error);
      throw error;
    }

    console.log("Email enviado com sucesso:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
