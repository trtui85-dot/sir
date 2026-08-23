import { db } from "./db";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export type SendResult = { ok: boolean; waId?: string; error?: string };

/* Low-level send via Meta Cloud API */
export async function sendWhatsAppText(toPhone: string, body: string): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, error: "not_configured" };
  const to = normalizePhone(toPhone);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body },
        }),
      }
    );
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
    return { ok: true, waId: json.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network" };
  }
}

/* Store message in DB + attempt real WhatsApp delivery */
export async function deliverMessage(opts: {
  conversationId: string;
  phone: string;
  body: string;
}): Promise<void> {
  const [_, result] = await Promise.all([
    db.message
      .create({
        data: { conversationId: opts.conversationId, direction: "OUT", body: opts.body },
      })
      .catch((e) => {
        console.warn("[whatsapp] store failed:", e instanceof Error ? e.message : e);
        return null;
      }),
    sendWhatsAppText(opts.phone, opts.body),
  ]);
  if (!result.ok) console.warn("[whatsapp] send failed:", result.error);
}

export async function getOrCreateConversation(phone: string, patientId?: string | null) {
  const existing = await db.conversation.findFirst({ where: { phone } });
  if (existing) return existing;
  return db.conversation.create({
    data: { phone, ...(patientId ? { patientId } : {}) },
  });
}

/* Template rendering with {{placeholders}} */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function renderStoredTemplate(key: string, vars: Record<string, string>): Promise<string> {
  const tpl = await db.messageTemplate.findUnique({ where: { key } });
  const fallback =
    key === "booking_confirmation"
      ? "Bonjour {{name}}, votre rendez-vous à {{clinic}} est confirmé pour le {{date}} à {{time}}."
      : key === "session_reminder"
        ? "Bonjour {{name}}, rappel : votre séance à {{clinic}} est prévue le {{date}} à {{time}}."
        : "{{name}}";
  return renderTemplate(tpl?.content ?? fallback, vars);
}
