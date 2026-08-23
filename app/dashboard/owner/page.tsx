"use client";

import { useState } from "react";
import { Shell } from "@/components/shell";
import { useMe, OverviewTab, BookingsTab, PatientsTab, DoctorsTab } from "./tabs-core";
import { AccountingTab, ExpensesTab, StockTab } from "./tabs-finance";
import { StaffTab, ServicesTab, WindowsTab } from "./tabs-config";
import { MessagesTab } from "./tabs-messages";
import { BotflowTab } from "./tabs-botflow";
import { SettingsTab } from "./tabs-settings";

export default function OwnerPage() {
  const [tab, setTab] = useState("dashboard");
  const user = useMe();

  if (!user)
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-[var(--muted)]">SIR…</div>
      </div>
    );

  return (
    <Shell role="OWNER" user={user} tab={tab} onTab={setTab}>
      {tab === "dashboard" && <OverviewTab onGo={setTab} />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "patients" && <PatientsTab />}
      {tab === "doctors" && <DoctorsTab />}
      {tab === "accounting" && <AccountingTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "stock" && <StockTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "windows" && <WindowsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "botflow" && <BotflowTab />}
      {tab === "settings" && <SettingsTab />}
    </Shell>
  );
}
