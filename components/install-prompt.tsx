"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Download, X, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const { t, lang } = useLanguage();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem("sir_install_dismissed") === "1") return;

    let iosTimer: ReturnType<typeof setTimeout> | undefined;

    const onBip = (e: Event) => {
      e.preventDefault();
      clearTimeout(iosTimer);
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari never fires beforeinstallprompt -> show manual instructions
    const ua = navigator.userAgent;
    const isIosSafari =
      /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgiOS/i.test(ua);
    if (isIosSafari) {
      setIsIos(true);
      iosTimer = setTimeout(() => setVisible(true), 2000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      clearTimeout(iosTimer);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") localStorage.setItem("sir_install_dismissed", "1");
    setDeferred(null);
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem("sir_install_dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 no-print" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
      <div
        className="mx-auto max-w-md card-sir p-4 shadow-2xl flex items-center gap-3 fade-in relative"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        role="dialog"
        aria-label={t("install_app")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="SIR" width={44} height={44} className="rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{t("install_app")}</p>
          <p className="text-xs text-[var(--muted)] leading-snug mt-0.5">
            {isIos ? t("ios_install_hint") : t("install_hint")}
            {isIos && lang === "fr" && <Share size={11} className="inline mx-0.5 -mt-0.5" />}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isIos && (
            <button className="btn btn-primary btn-sm whitespace-nowrap" onClick={install}>
              <Download size={13} /> Installer
            </button>
          )}
          <button className="btn btn-outline btn-sm whitespace-nowrap" onClick={dismiss}>
            {t("not_now")}
          </button>
        </div>
        <button className="btn btn-ghost btn-sm absolute top-1 end-1 opacity-50" onClick={dismiss} aria-label="close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
