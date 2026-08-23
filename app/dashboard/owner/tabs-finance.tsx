"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PageHeader, useToast } from "@/components/ui";
import { formatDate, formatMoney, useLanguage } from "@/lib/i18n";
import {
  Plus, Package, TrendingUp, Trash2, Pencil, Ban, KeyRound, Stethoscope,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

/* ---------- Accounting ---------- */

type AccountingData = {
  revenueSeries: { month: string; revenue: number }[];
  expenseSeries: { month: string; expense: number }[];
  byService: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
  totals: { billed: number; collected: number; outstanding: number; collectionRate: number };
  monthTotals: { revenue: number; expense: number };
};

export function AccountingTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [data, setData] = useState<AccountingData | null>(null);

  function exportCSV() {
    if (!data) return;
    const lines = ["type,name,month,amount"];
    data.revenueSeries.forEach((r) => lines.push(`revenue,,${r.month},${r.revenue}`));
    data.expenseSeries.forEach((e) => lines.push(`expense,,${e.month},${e.expense}`));
    data.byService.forEach((s) => lines.push(`by_service,"${s.name}",,${s.value}`));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sir-comptabilite-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  useEffect(() => {
    api<AccountingData>("/api/stats?scope=accounting").then(setData).catch(() => toast(t("error_occurred"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <p className="text-center p-8 text-sm text-[var(--muted)]">{t("loading")}</p>;

  const merged = data.revenueSeries.map((r, i) => ({
    month: r.month.slice(5),
    revenue: r.revenue,
    expense: data.expenseSeries[i]?.expense ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={t("accounting")}
        subtitle={`${t("collection_rate")}: ${data.totals.collectionRate}%`}
        actions={
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>⬇ CSV</button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="stat-card"><p className="text-xs text-[var(--muted)] font-semibold">Facturé</p><p className="text-lg font-extrabold mt-1">{formatMoney(data.totals.billed)}</p></div>
        <div className="stat-card"><p className="text-xs text-[var(--muted)] font-semibold">Encaissé</p><p className="text-lg font-extrabold text-emerald-600 mt-1">{formatMoney(data.totals.collected)}</p></div>
        <div className="stat-card"><p className="text-xs text-[var(--muted)] font-semibold">Impayé</p><p className="text-lg font-extrabold text-rose-500 mt-1">{formatMoney(data.totals.outstanding)}</p></div>
        <div className="stat-card"><p className="text-xs text-[var(--muted)] font-semibold">Profit (mois)</p><p className="text-lg font-extrabold text-[var(--primary)] mt-1">{formatMoney(data.monthTotals.revenue - data.monthTotals.expense)}</p></div>
      </div>

      <div className="card-sir p-4 mb-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={16} /> {t("revenue_trend_12m")}</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={merged} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b5bf0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5b5bf0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "inherit", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#5b5bf0" strokeWidth={2.5} fill="url(#gRev)" name="Recettes" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="transparent" name="Dépenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-sir p-4">
          <h3 className="font-bold text-sm mb-3">🏆 {t("revenue_by_service")}</h3>
          {data.byService.length === 0 ? <Empty text={t("no_data")} /> : (
            <>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.byService.slice(0, 6)} layout="vertical" margin={{ left: 30, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} stroke="var(--muted)" />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#5b5bf0" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {data.byService.map((s) => (
                  <div key={s.name} className="flex justify-between text-xs">
                    <span className="truncate me-2">{s.name}</span>
                    <span className="font-bold whitespace-nowrap">{formatMoney(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card-sir p-4">
          <h3 className="font-bold text-sm mb-3">💸 Dépenses par catégorie</h3>
          {data.expensesByCategory.length === 0 ? <Empty text={t("no_data")} /> : (
            <div className="space-y-2.5">
              {data.expensesByCategory.map((c) => {
                const max = data.expensesByCategory[0].value || 1;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate me-2">{c.name}</span>
                      <span className="font-bold">{formatMoney(c.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--primary-soft)] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#5b5bf0] to-violet-400 transition-all"
                        style={{ width: `${Math.max(6, (c.value / max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Expenses ---------- */

const EXPENSE_CATEGORIES = ["Fournitures médicales", "Salaires", "Loyer", "Électricité / Eau", "Marketing", "Équipement", "Maintenance", "Divers"];

type ExpenseRow = { id: string; label: string; amount: number; category: string; vendor: string | null; spentAt: string; voided: boolean };

export function ExpensesTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [form, setForm] = useState<{ label: string; amount: string; category: string; vendor: string; spentAt: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ expenses: ExpenseRow[] }>("/api/expenses");
      setRows(d.expenses);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form || !form.label.trim() || !form.amount) return;
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount), spentAt: form.spentAt || undefined }),
      });
      toast(t("saved"), "success");
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function voidExp(id: string) {
    if (!confirm(t("confirm_delete"))) return;
    try {
      await api(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify({ action: "void" }) });
      load();
    } catch {
      toast(t("error_occurred"), "error");
    }
  }

  const totalMonth = rows
    .filter((e) => !e.voided && new Date(e.spentAt).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title={t("expenses")}
        subtitle={`${t("expenses_this_month")}: ${formatMoney(totalMonth)}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() =>
            setForm({ label: "", amount: "", category: EXPENSE_CATEGORIES[0], vendor: "", spentAt: new Date().toISOString().slice(0, 10) })
          }>
            <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
          </button>
        }
      />

      {rows.length === 0 ? <Empty text={t("no_data")} /> : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className={`card-sir px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${e.voided ? "opacity-50 line-through" : ""}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{e.label}</p>
                <p className="text-xs text-[var(--muted)]">{e.category}{e.vendor ? ` · ${e.vendor}` : ""} · {formatDate(e.spentAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-500 whitespace-nowrap">-{formatMoney(e.amount)}</span>
                {!e.voided && (
                  <button className="btn btn-outline btn-sm text-rose-500" onClick={() => voidExp(e.id)}><Ban size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title={t("add")}>
          <div className="space-y-3">
            <Field label="Libellé"><input className="input" value={form.label} onChange={(ev) => setForm({ ...form, label: ev.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("amount")}><input type="number" className="input" value={form.amount} onChange={(ev) => setForm({ ...form, amount: ev.target.value })} /></Field>
              <Field label={t("date")}><input type="date" className="input" value={form.spentAt} onChange={(ev) => setForm({ ...form, spentAt: ev.target.value })} /></Field>
            </div>
            <Field label={t("category")}>
              <select className="select" value={form.category} onChange={(ev) => setForm({ ...form, category: ev.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fournisseur"><input className="input" value={form.vendor} onChange={(ev) => setForm({ ...form, vendor: ev.target.value })} /></Field>
            <button className="btn btn-primary w-full" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Stock ---------- */

type StockRow = {
  id: string; name: string; category: string; unitType: string; quantity: number;
  lowStockThreshold: number; supplier: string | null; unitPrice: number; purchaseDate: string;
};

export function StockTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState<{ name: string; category: string; unitType: string; quantity: string; lowStockThreshold: string; supplier: string; unitPrice: string } | null>(null);
  const [moveItem, setMoveItem] = useState<StockRow | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: StockRow[] }>("/api/stock");
      setRows(d.items);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form || !form.name.trim()) return;
    try {
      await api("/api/stock", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          lowStockThreshold: Number(form.lowStockThreshold),
          unitPrice: Number(form.unitPrice),
        }),
      });
      toast(t("saved"), "success");
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function move(action: "usage" | "restock") {
    if (!moveItem) return;
    const qtyStr = prompt(action === "usage" ? "Quantité utilisée :" : "Quantité reçue :", "1");
    const qty = Number(qtyStr);
    if (!qty || qty <= 0) return;
    try {
      await api(`/api/stock/${moveItem.id}`, { method: "PATCH", body: JSON.stringify({ action, quantity: qty }) });
      toast("✓", "success");
      setMoveItem(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  const q = search.trim().toLowerCase();
  let filtered = rows.filter((i) => !q || i.name.toLowerCase().includes(q));
  if (lowOnly) filtered = filtered.filter((i) => i.quantity <= i.lowStockThreshold);

  return (
    <div>
      <PageHeader
        title={t("stock")}
        actions={
          <>
            <button className={`btn btn-outline btn-sm ${lowOnly ? "!border-amber-400 !text-amber-500" : ""}`} onClick={() => setLowOnly(!lowOnly)}>⚠ Faible</button>
            <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: "", category: "Consumables", unitType: "piece", quantity: "", lowStockThreshold: "5", supplier: "", unitPrice: "" })}>
              <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
            </button>
          </>
        }
      />

      <input className="input mb-3 max-w-md" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? <Empty icon={<Package size={40} />} text={t("no_data")} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((i) => {
            const low = i.quantity <= i.lowStockThreshold;
            return (
              <div key={i.id} className="card-sir p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold truncate">{i.name}</p>
                  {low ? <Badge tone="red">{i.quantity} restant</Badge> : <Badge tone="green">{i.quantity}</Badge>}
                </div>
                <p className="text-xs text-[var(--muted)] mb-3">
                  {i.supplier ? `${i.supplier} · ` : ""}{formatMoney(i.unitPrice)}/u · acheté le {formatDate(i.purchaseDate)}
                </p>
                <div className="flex gap-1.5">
                  <button className="btn btn-outline btn-sm flex-1" onClick={() => setMoveItem(i)}>↕ Mouvement</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {moveItem && (
        <Modal open onClose={() => setMoveItem(null)} title={moveItem.name}>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-outline py-3" onClick={() => move("usage")}>↓ Sortie</button>
            <button className="btn btn-primary py-3" onClick={() => move("restock")}>↑ Entrée</button>
          </div>
        </Modal>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title={`${t("add")} — stock`}>
          <div className="space-y-3">
            <Field label={t("name")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité"><input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
              <Field label={t("unit_price")}><input type="number" className="input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("min_stock")}><input type="number" className="input" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></Field>
              <Field label="Fournisseur"><input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
            </div>
            <p className="text-xs text-[var(--muted)]">💡 L&apos;achat génère automatiquement une dépense.</p>
            <button className="btn btn-primary w-full" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
