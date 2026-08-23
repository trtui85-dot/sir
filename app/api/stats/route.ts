import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "dashboard"; // dashboard | accounting | doctors
  const doctorId = searchParams.get("doctorId");

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (scope === "dashboard") {
    const [todayBookings, pendingPayments, newPatientsMonth, monthPaymentsAgg] = await Promise.all([
      db.booking.findMany({
        where: { date: { gte: todayStart, lt: todayEnd } },
        include: { patient: true, doctor: true },
        orderBy: { createdAt: "asc" },
      }),
      db.payment.count({ where: { verified: false, voided: false } }),
      db.patient.count({ where: { createdAt: { gte: monthStart, lt: nextMonth } } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { voided: false, createdAt: { gte: monthStart, lt: nextMonth } } }),
    ]);

    let revenueThisMonth = monthPaymentsAgg._sum.amount ?? 0;
    let expensesThisMonth = 0;
    if (session.role === "OWNER") {
      const agg = await db.expense.aggregate({
        _sum: { amount: true },
        where: { voided: false, spentAt: { gte: monthStart, lt: nextMonth } },
      });
      expensesThisMonth = agg._sum.amount ?? 0;
    }

    // doctor scoping
    let bookings = todayBookings;
    let myRevenue = null as number | null;
    if (session.role === "DOCTOR" && session.doctorProfileId) {
      bookings = todayBookings.filter((b) => b.doctorId === session.doctorProfileId);
      const visitsAgg = await db.visit.aggregate({
        _sum: { totalAmount: true, paidAmount: true },
        where: { doctorId: session.doctorProfileId, visitDate: { gte: monthStart, lt: nextMonth }, freeVisit: false },
      });
      myRevenue = visitsAgg._sum.totalAmount ?? 0;
    }

    return NextResponse.json({
      todayBookings: bookings,
      queueCount: bookings.filter((b) => ["IN_WAITING_ROOM", "IN_TREATMENT", "CONFIRMED"].includes(b.status)).length,
      completedToday: bookings.filter((b) => b.status === "COMPLETED").length,
      pendingPayments,
      newPatientsMonth,
      revenueThisMonth,
      expensesThisMonth,
      profitThisMonth: revenueThisMonth - expensesThisMonth,
      myRevenue,
      patientsTotal: await db.patient.count(),
    });
  }

  if (scope === "accounting") {
    if (session.role !== "OWNER") {
      const s2 = await getSession();
      if (!s2 || s2.role !== "SECRETARY") {
        return NextResponse.json({ error: "No accounting access" }, { status: 403 });
      }
    }

    // last 12 months revenue & expenses series
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const payments = await db.payment.findMany({
      where: { voided: false, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { amount: true, createdAt: true },
    });
    const expenses = await db.expense.findMany({
      where: { voided: false, spentAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { amount: true, spentAt: true, category: true },
    });

    const revenueSeries = months.map((m) => ({
      month: m,
      revenue: payments.filter((p) => `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}` === m)
        .reduce((s, p) => s + p.amount, 0),
    }));
    const expenseSeries = months.map((m) => ({
      month: m,
      expense: expenses.filter((e) => `${e.spentAt.getFullYear()}-${String(e.spentAt.getMonth() + 1).padStart(2, "0")}` === m)
        .reduce((s, e) => s + e.amount, 0),
    }));

    // revenue by service from invoices itemsJson
    const invoices = await db.invoice.findMany({
      where: { status: { in: ["PAID", "PARTIAL"] } },
      select: { itemsJson: true, discountType: true, discountValue: true, subtotal: true, total: true, paid: true, createdAt: true },
    });
    const byService: Record<string, number> = {};
    let billed = 0;
    let collected = 0;
    for (const inv of invoices) {
      billed += inv.subtotal;
      collected += inv.paid;
      const items = inv.itemsJson as unknown as { label: string; qty?: number; unitPrice?: number }[];
      const invTotal = Array.isArray(items) ? items.reduce((s, it) => s + Number(it.qty || 1) * Number(it.unitPrice || 0), 0) : 0;
      const factor = inv.subtotal > 0 ? inv.total / inv.subtotal : 1;
      for (const it of items ?? []) {
        const label = it.label || "Service";
        byService[label] = (byService[label] ?? 0) + Number(it.qty || 1) * Number(it.unitPrice || 0) * factor;
      }
    }

    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
    }

    return NextResponse.json({
      revenueSeries,
      expenseSeries,
      byService: Object.entries(byService).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      totals: {
        billed,
        collected,
        outstanding: Math.max(0, billed - collected),
        collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 100,
      },
      monthTotals: {
        revenue: revenueSeries[revenueSeries.length - 1]?.revenue ?? 0,
        expense: expenseSeries[expenseSeries.length - 1]?.expense ?? 0,
      },
    });
  }

  if (scope === "doctors") {
    if (session.role !== "OWNER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const doctors = await db.doctorProfile.findMany({ include: { user: true } });
    const result = [];
    for (const d of doctors) {
      const visits = await db.visit.findMany({
        where: { doctorId: d.id, freeVisit: false },
        select: { totalAmount: true, paidAmount: true },
      });
      const monthVisits = await db.visit.count({
        where: { doctorId: d.id, visitDate: { gte: monthStart, lt: nextMonth } },
      });
      const totalBilled = visits.reduce((s, v) => s + v.totalAmount, 0);
      const totalPaid = visits.reduce((s, v) => s + v.paidAmount, 0);
      result.push({
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        userLinked: !!d.user,
        visitsTotal: visits.length,
        visitsMonth: monthVisits,
        totalBilled,
        totalPaid,
        compensation: d.compensation,
        salaryAmount: d.salaryAmount,
        percentRate: d.percentRate,
        estimatedDue:
          d.compensation === "SALARY_PLUS_PERCENT"
            ? d.salaryAmount + (totalPaid * d.percentRate) / 100
            : d.salaryAmount,
      });
    }
    return NextResponse.json({ doctors: result });
  }

  if (scope === "doctor-detail") {
    if (!doctorId) return NextResponse.json({ error: "doctorId requis." }, { status: 400 });
    const d = await db.doctorProfile.findUnique({ where: { id: doctorId }, include: { user: true } });
    if (!d) return NextResponse.json({ error: "Médecin introuvable." }, { status: 404 });
    const visits = await db.visit.findMany({
      where: { doctorId },
      orderBy: { visitDate: "desc" },
      take: 200,
      include: { patient: true },
    });
    const totalBilled = visits.filter((v) => !v.freeVisit).reduce((s, v) => s + v.totalAmount, 0);
    const totalPaid = visits.reduce((s, v) => s + v.paidAmount, 0);
    return NextResponse.json({
      doctor: d,
      stats: {
        visitsTotal: visits.length,
        patients: new Set(visits.map((v) => v.patientId)).size,
        totalBilled,
        totalPaid,
        estimatedDue:
          d.compensation === "SALARY_PLUS_PERCENT"
            ? d.salaryAmount + (totalPaid * d.percentRate) / 100
            : d.salaryAmount,
      },
      recentVisits: visits.slice(0, 20),
    });
  }

  return NextResponse.json({ error: "Scope inconnu." }, { status: 400 });
}
