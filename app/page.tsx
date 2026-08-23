"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { Stethoscope, UserCog, Crown, Languages, ChevronRight, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function PortalPage() {
  const { t, lang, setLang } = useLanguage();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sir_theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sir_theme", next ? "dark" : "light");
  };

  const portals = [
    { href: "/login?portal=secretary", icon: <UserCog size={26} />, color: "#06b6d4", title: t("secretary"), desc: t("secretary_desc") },
    { href: "/login?portal=doctor", icon: <Stethoscope size={26} />, color: "#5b5bf0", title: t("doctor"), desc: t("doctor_desc") },
    { href: "/login?portal=owner", icon: <Crown size={26} />, color: "#8b5cf6", title: t("clinic_owner"), desc: t("owner_desc") },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="flex justify-end gap-2 mb-6 no-print">
          <button className="btn btn-outline btn-sm" onClick={() => setLang(lang === "fr" ? "ar" : "fr")}>
            <Languages size={15} /> {lang === "fr" ? "العربية" : "Français"}
          </button>
          <button className="btn btn-outline btn-sm" onClick={toggleTheme} aria-label="theme">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <header className="text-center mb-10 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-lg"
            style={{ background: "linear-gradient(135deg,#5b5bf0,#8b5cf6)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">SIR</h1>
          <p className="mt-2 text-[var(--muted)] text-base sm:text-lg">{t("tagline")}</p>
        </header>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 fade-in">
          {portals.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="card-sir group p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5 shadow-md transition-transform group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)` }}
              >
                {p.icon}
              </div>
              <h2 className="font-bold text-lg">{p.title}</h2>
              <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed min-h-[42px]">{p.desc}</p>
              <span className="inline-flex items-center gap-1 mt-4 font-semibold text-sm" style={{ color: p.color }}>
                {t("select")}
                <ChevronRight size={16} className={`transition-transform group-hover:translate-x-1 ${lang === "ar" ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-10 opacity-70">CLINIQ.OS · SIR © 2026</p>
      </div>
    </main>
  );
}
