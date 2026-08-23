import { handleIncomingWhatsApp } from "@/lib/bot";

/* GET — webhook verification by Meta (hub.challenge) */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type WebhookBody = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { profile?: { name?: string } }[];
        messages?: {
          from: string;
          type: string;
          text?: { body?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }[];
      };
    }[];
  }[];
};

/* POST — incoming messages */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookBody;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue; // ignore statuses / reads
        const pushName = value.contacts?.[0]?.profile?.name;

        for (const msg of value.messages) {
          const text =
            msg.text?.body ??
            msg.interactive?.button_reply?.title ??
            msg.interactive?.list_reply?.title ??
            "";
          if (!text) continue;
          await handleIncomingWhatsApp(msg.from, text, pushName).catch((e) =>
            console.error("[whatsapp] bot error:", e)
          );
        }
      }
    }
  } catch (e) {
    console.error("[whatsapp] webhook parse error:", e);
  }

  /* Always 200 so Meta doesn't retry indefinitely */
  return Response.json({ received: true });
}
