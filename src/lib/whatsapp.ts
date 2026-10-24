import "server-only";

/**
 * WhatsApp notifications for order requests.
 *
 * Uses the Meta WhatsApp Cloud API when WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are
 * configured. Without keys it falls back to a wa.me deep link + console log so
 * the flow is fully exercisable in local dev (same pattern as lib/mail.ts).
 */

const GRAPH_VERSION = "v20.0";

export function whatsappEnabled(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

/** Normalise to digits-only with country code, e.g. 9876543210 -> 919876543210. */
export function normalizeWhatsappNumber(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return digits;
}

/** One-click wa.me link with a pre-filled message (works with zero config). */
export function waMeLink(phone: string, message: string): string {
  const to = normalizeWhatsappNumber(phone) ?? phone;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export interface WhatsappInput {
  to: string | null;
  message: string;
}

export async function sendWhatsapp(input: WhatsappInput): Promise<{ sent: boolean; fallbackUrl?: string; error?: string }> {
  const to = normalizeWhatsappNumber(input.to ?? "");
  if (!to) return { sent: false, error: "No WhatsApp number on this order." };

  const fallbackUrl = waMeLink(to, input.message);

  if (!whatsappEnabled()) {
    console.log(`[whatsapp:console-fallback] to=+${to}\n${input.message}\n(open ${fallbackUrl} to send manually)`);
    return { sent: false, fallbackUrl };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: input.message },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 400);
      console.error("[whatsapp] API error", res.status, body);
      return { sent: false, fallbackUrl, error: `WhatsApp API ${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[whatsapp] send failed", error);
    return { sent: false, fallbackUrl, error: "Network error" };
  }
}

/** Message templates ------------------------------------------------------- */

export function requestReceivedMessage(input: { orderNumber: string; total: string }): string {
  return (
    `Hi! We received your request ${input.orderNumber} (${input.total}) on Aureline Atelier.\n\n` +
    `Our team will review the artwork and confirm the slot on WhatsApp within a few hours. ` +
    `No payment is needed until your request is approved.`
  );
}

export function requestAcceptedMessage(input: { orderNumber: string; note?: string | null }): string {
  return (
    `Good news! Your request ${input.orderNumber} has been accepted and your print slot is confirmed.\n\n` +
    (input.note ? `Update: ${input.note}\n\n` : "") +
    `Track it anytime at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track`
  );
}

/** Sent when the parcel is handed to the courier (delivery orders). */
export function shippedMessage(input: {
  orderNumber: string;
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): string {
  const lines = [`Your order ${input.orderNumber} is on its way.`];
  if (input.courier) lines.push(`Courier: ${input.courier}`);
  if (input.trackingNumber) lines.push(`Tracking: ${input.trackingNumber}`);
  if (input.trackingUrl) lines.push(`Follow: ${input.trackingUrl}`);
  else lines.push(`Track: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track`);
  return lines.join("\n");
}

/**
 * Sent instead of shippedMessage for pickup (take away) orders once the parcel
 * is packed and waiting at the counter.
 */
export function pickupReadyMessage(input: {
  orderNumber: string;
  store: string;
  unit?: string | null;
  note?: string | null;
}): string {
  const where = input.unit ? `${input.store}, ${input.unit}` : input.store;
  return (
    `Your order ${input.orderNumber} is packed and ready for pickup at ${where}.\n\n` +
    (input.note ? `Note: ${input.note}\n\n` : "") +
    `Please bring this message and a photo ID. We hold pickups for 7 days.`
  );
}
