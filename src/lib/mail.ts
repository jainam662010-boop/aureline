import "server-only";
import { Resend } from "resend";
import { APP_NAME } from "@/lib/constants";

const resendEnabled = Boolean(process.env.RESEND_API_KEY);

function client(): Resend | null {
  if (!resendEnabled) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends transactional email via Resend. When RESEND_API_KEY is missing the
 * message is logged to the server console instead (local development).
 */
export async function sendEmail(input: SendEmailInput): Promise<{ delivered: boolean; id?: string; error?: string }> {
  const resend = client();
  if (!resend) {
    console.info("\n─────────── [EMAIL:DEV FALLBACK] ───────────");
    console.info(`To:      ${Array.isArray(input.to) ? input.to.join(", ") : input.to}`);
    console.info(`Subject: ${input.subject}`);
    console.info(input.text ?? input.html.replace(/<[^>]+>/g, " ").slice(0, 500));
    console.info("─────────────────────────────────────────────\n");
    return { delivered: false };
  }
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${APP_NAME} <orders@aureline.in>`,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) return { delivered: false, error: result.error.message };
    return { delivered: true, id: result.data?.id };
  } catch (error) {
    console.error("[mail] send failed", error);
    return { delivered: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

/* -------------------------------------------------------------------------- */
/* Email templates — light theme for deliverability, brand gradient header     */
/* -------------------------------------------------------------------------- */

export function emailShell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `
  <div style="background:#F4F7FB;padding:32px 16px;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:24px;border:1px solid #DCE6F2;overflow:hidden;">
      <tr>
        <td style="padding:20px 28px;background:linear-gradient(90deg,#2563EB,#0EA5E9,#7C3AED);">
          <span style="color:#fff;font-weight:800;letter-spacing:2px;font-size:16px;">${APP_NAME.toUpperCase()}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;color:#0B1524;">
          <h1 style="font-size:20px;margin:0 0 16px;color:#fff;">${title}</h1>
          ${bodyHtml}
          ${
            cta
              ? `<p style="margin:28px 0 0;"><a href="${cta.href}" style="display:inline-block;background:linear-gradient(90deg,#2563EB,#0EA5E9);color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">${cta.label}</a></p>`
              : ""
          }
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;border-top:1px solid #DCE6F2;color:#64748B;font-size:12px;">
          ${APP_NAME} · Custom DTF printing, Pan-India · Questions? Reply to this email.
        </td>
      </tr>
    </table>
  </div>`;
}

export function orderConfirmationEmail(input: {
  to: string;
  orderNumber: string;
  total: string;
  items: { name: string; qty: number }[];
  trackingUrl?: string;
}) {
  const rows = input.items
    .map((i) => `<li style="margin:6px 0;color:#475569;">${i.name} × ${i.qty}</li>`)
    .join("");
  return {
    to: input.to,
    subject: `Order ${input.orderNumber} confirmed — ${APP_NAME}`,
    html: emailShell(
      `Payment received for ${input.orderNumber}`,
      `
      <p style="color:#475569;">Thanks for your order. Our team is reviewing your artwork before it goes to print.</p>
      <ul style="padding-left:18px;">${rows}</ul>
      <p style="font-size:16px;color:#fff;"><strong>Order total: ${input.total}</strong></p>
      <p style="color:#64748B;font-size:13px;">Status: Payment confirmed → Artwork review (within 12h).</p>
      `,
      input.trackingUrl ? { label: "Track your order", href: input.trackingUrl } : undefined,
    ),
    text: `Order ${input.orderNumber} confirmed. Total ${input.total}.`,
  };
}

export function orderStatusEmail(input: { to: string; orderNumber: string; status: string; note?: string; trackingUrl?: string }) {
  return {
    to: input.to,
    subject: `Update on order ${input.orderNumber} — ${input.status.replace(/_/g, " ").toLowerCase()}`,
    html: emailShell(
      `Your order is now: ${input.status.replace(/_/g, " ").toLowerCase()}`,
      `<p style="color:#475569;">${input.note ?? "Production is progressing on schedule."}</p>`,
      input.trackingUrl ? { label: "Track order", href: input.trackingUrl } : undefined,
    ),
    text: `Order ${input.orderNumber} status: ${input.status}`,
  };
}

export function passwordResetEmail(input: { to: string; name?: string | null; resetUrl: string }) {
  return {
    to: input.to,
    subject: `Reset your ${APP_NAME} password`,
    html: emailShell(
      "Password reset requested",
      `<p style="color:#475569;">Hi ${input.name ?? "there"}, we received a request to reset your password. This link expires in 60 minutes.</p>`,
      { label: "Reset password", href: input.resetUrl },
    ),
    text: `Reset your password: ${input.resetUrl}`,
  };
}

export function bulkEnquiryEmail(input: { name: string; email: string; phone: string; quantity: number; productName?: string; message?: string }) {
  return {
    to: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? "sales@aureline.in",
    subject: `New bulk enquiry — ${input.quantity} pcs from ${input.name}`,
    html: emailShell(
      "New bulk order enquiry",
      `<p style="color:#475569;"><strong>${input.name}</strong> · ${input.email} · ${input.phone}</p>
       <p style="color:#475569;">Quantity: ${input.quantity}${input.productName ? ` · Product: ${input.productName}` : ""}</p>
       <p style="color:#475569;">${(input.message ?? "").replace(/\n/g, "<br/>")}</p>`,
    ),
    text: `${input.name} — ${input.quantity} pcs`,
  };
}
