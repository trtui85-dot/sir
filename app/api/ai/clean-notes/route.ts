import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

function localClean(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    const capitalized = line.charAt(0).toUpperCase() + line.slice(1);
    out.push(/^[•\-\d]/.test(capitalized) ? capitalized : `• ${capitalized}`);
  }
  return out.join("\n");
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const raw = String(body.text || "").trim();
  if (!raw) return NextResponse.json({ error: "Texte vide." }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Tu es l'assistant d'une clinique dentaire. Réécris les notes cliniques brutes du médecin en un compte-rendu professionnel, structuré et clair, dans la même langue que la note. Garde toutes les informations médicales. Réponds uniquement avec le compte-rendu.",
            },
            { role: "user", content: raw },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const cleaned = data.choices?.[0]?.message?.content;
        if (cleaned) return NextResponse.json({ cleaned, source: "openai" });
      }
    } catch {
      // fall through to local clean
    }
  }

  return NextResponse.json({ cleaned: localClean(raw), source: "local" });
}
