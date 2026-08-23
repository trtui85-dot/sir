"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/components/ui";
import { Languages, LockKeyhole, Phone, ArrowLeft } from "lucide-react";

const roleHome: Record<string, string> = {
  secretary: "/dashboard/secretary",
  doctor: "/dashboard/doctor",
  owner: "/dashboard/owner",
};

function LoginForm() {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const portal = params.get("portal") || "secretary";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      const role = res.user.role.toLowerCase();
      router.replace(roleHome[role] ?? "/dashboard/secretary");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("invalid_credentials"));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card-sir p-8 sm:p-10 fade-in">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="btn btn-ghost btn-sm -ms-2">
            <ArrowLeft size={16} /> {t("choose_another_portal")}
          </Link>
          <button className="btn btn-outline btn-sm" onClick={() => setLang(lang === "fr" ? "ar" : "fr")}>
            <Languages size={14} />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg,#5b5bf0,#8b5cf6)" }}>
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-2xl font-extrabold">SIR</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{t("portal")}: {t(portal === "owner" ? "clinic_owner" : portal)}</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label">{t("phone_number")}</label>
            <div className="relative">
              <Phone size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className="input ps-10"
                type="tel"
                required
                dir="ltr"
                placeholder="+222 00 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">{t("password")}</label>
            <input
              className="input"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {err && (
            <p className="text-sm font-medium px-3 py-2.5 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">{err}</p>
          )}

          <button className="btn btn-primary w-full py-3.5 text-base" disabled={busy}>
            {busy ? "…" : t("sign_in")}
          </button>
        </form>

        <p className="text-xs text-[var(--muted)] text-center mt-6">{t("forgot_password")}</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
