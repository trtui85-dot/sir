"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage, type Lang } from "@/lib/i18n";
import {
  LogOut, Languages, Moon, Sun, Menu, X,
  LayoutDashboard, CalendarDays, Users, CreditCard, MessageSquare,
  CalendarClock, FolderHeart, BarChart3, Wallet, Receipt, Package,
  UserCog, Crown, Stethoscope, Settings as SettingsIcon, Megaphone, Bot, Wrench,
} from "lucide-react";

export type NavItem = { key: string; labelKey: string; icon: React.ReactNode };

export const NAV: Record<string, NavItem[]> = {
  SECRETARY: [
    { key: "today", labelKey: "today", icon: <CalendarDays size={19} /> },
    { key: "bookings", labelKey: "bookings", icon: <CalendarClock size={19} /> },
    { key: "patients", labelKey: "patients", icon: <Users size={19} /> },
    { key: "payments", labelKey: "payments", icon: <CreditCard size={19} /> },
    { key: "messages", labelKey: "messages", icon: <MessageSquare size={19} /> },
  ],
  DOCTOR: [
    { key: "schedule", labelKey: "schedule", icon: <CalendarClock size={19} /> },
    { key: "patients", labelKey: "my_patients", icon: <FolderHeart size={19} /> },
    { key: "stats", labelKey: "my_stats", icon: <BarChart3 size={19} /> },
  ],
  OWNER: [
    { key: "dashboard", labelKey: "dashboard", icon: <LayoutDashboard size={19} /> },
    { key: "bookings", labelKey: "bookings", icon: <CalendarClock size={19} /> },
    { key: "patients", labelKey: "patients", icon: <Users size={19} /> },
    { key: "doctors", labelKey: "doctors", icon: <Stethoscope size={19} /> },
    { key: "accounting", labelKey: "accounting", icon: <Wallet size={19} /> },
    { key: "expenses", labelKey: "expenses", icon: <Receipt size={19} /> },
    { key: "stock", labelKey: "stock", icon: <Package size={19} /> },
    { key: "staff", labelKey: "staff", icon: <UserCog size={19} /> },
    { key: "services", labelKey: "services", icon: <Wrench size={19} /> },
    { key: "windows", labelKey: "windows", icon: <CalendarDays size={19} /> },
    { key: "messages", labelKey: "messages", icon: <Megaphone size={19} /> },
    { key: "botflow", labelKey: "bot_flow", icon: <Bot size={19} /> },
    { key: "settings", labelKey: "settings", icon: <SettingsIcon size={19} /> },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "role_owner",
  DOCTOR: "role_doctor",
  SECRETARY: "role_secretary",
};

export function Shell({
  role,
  user,
  tab,
  onTab,
  children,
}: {
  role: string;
  user: { name: string };
  tab: string;
  onTab: (key: string) => void;
  children: React.ReactNode;
}) {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sir_theme");
    setDark(stored === "dark");
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sir_theme", next ? "dark" : "light");
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const items = NAV[role] ?? [];
  const current = items.find((i) => i.key === tab);

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4 no-print"
        style={{ background: "var(--sidebar)" }}>
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg"
            style={{ background: "linear-gradient(135deg,#5b5bf0,#8b5cf6)" }}>
            S
          </div>
          <div>
            <div className="text-white font-extrabold leading-none">SIR</div>
            <div className="text-[10px] text-[#a6aacb] mt-1 uppercase tracking-wider">{t(ROLE_LABEL[role])}</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link w-full ${tab === item.key ? "active" : ""}`}
              onClick={() => onTab(item.key)}
            >
              {item.icon}
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="pt-3 border-t border-white/10 space-y-1">
          <div className="px-3 py-2">
            <div className="text-white text-sm font-semibold truncate">{user.name}</div>
            <div className="text-[11px] text-[#a6aacb]">{t("welcome")}</div>
          </div>
          <button className="sidebar-link w-full text-[#ff8f8f] hover:text-white" onClick={logout}>
            <LogOut size={18} />
            <span>{t("sign_out")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 no-print"
        style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button className="btn btn-ghost btn-sm -ms-2" onClick={() => setDrawer(true)} aria-label="menu">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="font-black">SIR</div>
            <span className="badge badge-blue">{t(current?.labelKey ?? "dashboard")}</span>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={() => setLang(lang === "fr" ? "ar" : "fr")} aria-label="langue">
              <Languages size={17} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="thème">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden no-print" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className={`absolute top-0 bottom-0 w-72 max-w-[85vw] p-4 flex flex-col ${lang === "ar" ? "right-0" : "left-0"}`}
            style={{ background: "var(--sidebar)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1 py-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black"
                  style={{ background: "linear-gradient(135deg,#5b5bf0,#8b5cf6)" }}>S</div>
                <span className="text-white font-bold">SIR</span>
              </div>
              <button className="text-white/70 p-1" onClick={() => setDrawer(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.key}
                  className={`sidebar-link w-full ${tab === item.key ? "active" : ""}`}
                  onClick={() => { onTab(item.key); setDrawer(false); }}
                >
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </button>
              ))}
            </nav>
            <div className="pt-3 border-t border-white/10">
              <div className="px-3 pb-2 text-white text-sm font-semibold">{user.name}</div>
              <button className="sidebar-link w-full text-[#ff8f8f]" onClick={logout}>
                <LogOut size={18} /> <span>{t("sign_out")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl mx-auto fade-in" key={tab}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav no-print">
        {items.slice(0, 4).map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${tab === item.key ? "active" : ""}`}
            onClick={() => onTab(item.key)}
          >
            {item.icon}
            <span className="max-w-[64px] truncate">{t(item.labelKey)}</span>
          </button>
        ))}
        <button className="bottom-nav-item" onClick={() => setDrawer(true)} aria-label="plus">
          <Menu size={19} />
          <span>Plus</span>
        </button>
      </nav>
    </div>
  );
}
