"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, Empty, Modal, PageHeader, useToast } from "@/components/ui";
import { formatDateTime, useLanguage } from "@/lib/i18n";
import { Send, Megaphone } from "lucide-react";

type Conversation = {
  id: string; phone: string; contactName: string | null; lastMessageAt: string;
  messages: { id: string; body: string; direction: string; createdAt: string }[];
};

export function MessagesTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[] }>("/api/messages");
      setConvos(d.conversations);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, convos]);

  const active = convos.find((c) => c.id === activeId);

  async function send() {
    if (!active || !reply.trim()) return;
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ conversationId: active.id, content: reply }),
      });
      setReply("");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("messages")}
        subtitle={`${convos.length} conversation(s)`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setBroadcastOpen(true)}>
            <Megaphone size={14} /> <span className="hidden sm:inline">{t("broadcast")}</span>
          </button>
        }
      />

      {convos.length === 0 && !broadcastOpen ? (
        <Empty icon={<Send size={40} />} text={t("no_data")} />
      ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          <div className={`space-y-2 max-h-[65vh] overflow-y-auto ${activeId ? "hidden md:block" : ""}`}>
            {convos.map((c) => (
              <button
                key={c.id}
                className={`card-sir px-3.5 py-3 w-full text-start transition ${c.id === activeId ? "!border-[var(--primary)]" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-sm truncate">{c.contactName ?? c.phone}</span>
                  <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{formatDateTime(c.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                  {c.messages[c.messages.length - 1]?.body ?? "—"}
                </p>
              </button>
            ))}
          </div>

          {active && (
            <div className="card-sir flex flex-col h-[65vh]">
              <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
                <button className="btn btn-outline btn-sm md:hidden" onClick={() => setActiveId(null)}>←</button>
                <p className="font-bold text-sm">{active.contactName ?? active.phone}</p>
                <span className="text-xs text-[var(--muted)]">{active.phone}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg)] rounded-b-2xl">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.direction === "OUT"
                        ? "ms-auto bg-[var(--primary)] text-white rounded-ee-sm"
                        : "me-auto bg-[var(--surface)] border border-[var(--border)] rounded-es-sm"
                    }`}
                  >
                    {m.body}
                    <div className="text-[10px] opacity-60 mt-1">{formatDateTime(m.createdAt)}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t border-[var(--border)] flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Répondre…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn btn-primary" onClick={send}><Send size={15} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {broadcastOpen && <BroadcastModal onClose={() => { setBroadcastOpen(false); load(); }} />}
    </div>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [text, setText] = useState("");

  useEffect(() => {
    api<{ patients: typeof patients }>("/api/patients").then((d) => setPatients(d.patients)).catch(() => {});
  }, []);

  const count = Object.values(selected).filter(Boolean).length;

  async function send() {
    if (!text.trim() || count === 0) return;
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          broadcast: true,
          patientIds: Object.keys(selected).filter((k) => selected[k]),
          content: text,
        }),
      });
      toast(`✓ ${count}`, "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <Modal open title={`${t("broadcast")} — ${count} destinataire(s)`} onClose={onClose}>
      <div className="space-y-3">
        <textarea className="textarea" rows={3} placeholder="Message…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="border border-[var(--border)] rounded-xl max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
          {patients.map((p) => (
            <label key={p.id} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-[var(--bg)]">
              <span className="truncate">
                {p.name}
                <span className="text-xs text-[var(--muted)] ms-2">{p.phone}</span>
              </span>
              <input
                type="checkbox"
                checked={!!selected[p.id]}
                onChange={(e) => setSelected({ ...selected, [p.id]: e.target.checked })}
              />
            </label>
          ))}
        </div>
        <button className="btn btn-primary w-full" disabled={!text.trim() || count === 0} onClick={send}>
          <Send size={15} /> Envoyer à {count} patient(s)
        </button>
      </div>
    </Modal>
  );
}
