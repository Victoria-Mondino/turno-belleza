import twilio from "twilio";
import { BUSINESS } from "./business";
import type { Booking } from "./types";

export function waLink(numero: string, mensaje: string): string {
  const clean = numero.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

interface NotifyResult {
  sent: boolean;
  fallback: { business: string; client: string };
}

/**
 * Si Twilio y las plantillas están configurados, manda los 2 WhatsApp por API.
 * Si no, devuelve los links wa.me equivalentes para enviar a mano (ver sección 04
 * del blueprint: "wa.me como fallback mientras se aprueban las plantillas").
 */
export async function notifyBooking(booking: Booking): Promise<NotifyResult> {
  const businessMsg = [
    "Nuevo turno reservado",
    `Cliente: ${booking.customerName}`,
    `Teléfono: ${booking.customerPhone}`,
    `Servicio: ${booking.serviceName}`,
    `Profesional: ${booking.professionalName}`,
    `Fecha: ${booking.date} ${booking.startTime}hs`,
    `Notas: ${booking.notes || "-"}`,
  ].join("\n");

  const clientMsg = [
    `¡Turno confirmado! ${booking.serviceName} el ${booking.date} a las ${booking.startTime}hs.`,
    BUSINESS.address,
    "Ante cualquier cambio avisanos con anticipación. ¡Te esperamos!",
  ].join("\n");

  const fallback = {
    business: waLink(BUSINESS.whatsapp, businessMsg),
    client: waLink(booking.customerPhone, clientMsg),
  };

  const client = getClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  const templateNuevoTurno = process.env.TEMPLATE_TURNO_NUEVO_SID;
  const templateConfirmacion = process.env.TEMPLATE_CONFIRMACION_SID;

  if (!client || !from || !templateNuevoTurno || !templateConfirmacion) {
    return { sent: false, fallback };
  }

  try {
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${BUSINESS.whatsapp}`,
      contentSid: templateNuevoTurno,
      contentVariables: JSON.stringify({
        1: booking.customerName,
        2: booking.customerPhone,
        3: booking.serviceName,
        4: booking.date,
        5: booking.startTime,
        6: booking.notes || "Sin notas",
      }),
    });

    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${booking.customerPhone}`,
      contentSid: templateConfirmacion,
      contentVariables: JSON.stringify({
        1: booking.serviceName,
        2: booking.date,
        3: booking.startTime,
      }),
    });

    return { sent: true, fallback };
  } catch (err) {
    console.error("No se pudo enviar el WhatsApp por Twilio, se ofrece el fallback wa.me", err);
    return { sent: false, fallback };
  }
}
