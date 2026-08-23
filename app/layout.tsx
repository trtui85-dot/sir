import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIR — Gestion de clinique",
  description: "Portail Patients & Personnel — Clinique dentaire SIR",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b5bf0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
