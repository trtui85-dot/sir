import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seed SIR…");

  /* ---- Users & doctors ---- */
  const hash = await bcrypt.hash("sir2026", 10);

  const owner = await db.user.upsert({
    where: { phone: "+222000000001" },
    update: {},
    create: { phone: "+222000000001", password: hash, name: "Dr. Propriétaire", role: "OWNER" },
  });

  const doctorProfile = await db.doctorProfile.create({
    data: {
      name: "Dr. Ahmed SIR",
      specialty: "Dentisterie générale",
      compensation: "SALARY_PLUS_PERCENT",
      salaryAmount: 60000,
      percentRate: 30,
    },
  });

  const doctorUser = await db.user.upsert({
    where: { phone: "+222000000002" },
    update: { doctorProfileId: doctorProfile.id },
    create: {
      phone: "+222000000002",
      password: hash,
      name: "Dr. Ahmed",
      role: "DOCTOR",
      doctorProfileId: doctorProfile.id,
    },
  });

  const secretary = await db.user.upsert({
    where: { phone: "+222000000003" },
    update: {},
    create: {
      phone: "+222000000003",
      password: hash,
      name: "Fatima Secrétaire",
      role: "SECRETARY",
      permissions: { edit_patients: true, view_notes: true, view_accounting: false, upload_docs: true },
    },
  });
  await db.doctorProfile.create({
    data: {
      name: "Dr. Mariam",
      specialty: "Orthodontie",
      compensation: "FIXED_SALARY",
      salaryAmount: 80000,
      percentRate: 0,
    },
  });

  /* ---- Clinic settings ---- */
  await db.clinicSetting.upsert({
    where: { id: "main" },
    update: {
      clinicName: "SIR",
      headerTitle: "Cabinet Dentaire SIR",
      headerPhone: "+222 00 00 00 00",
      headerAddress: "Nouakchott, Mauritanie",
      whatsappPhone: "+222000000003",
      primaryColor: "#5b5bf0",
      aiEnabled: false,
    },
    create: {
      id: "main",
      clinicName: "SIR",
      headerTitle: "Cabinet Dentaire SIR",
      headerPhone: "+222 00 00 00 00",
      headerAddress: "Nouakchott, Mauritanie",
      whatsappPhone: "+222000000003",
      primaryColor: "#5b5bf0",
    },
  });

  /* ---- Services ---- */
  const services = [
    { name: "Consultation", category: "Diagnostic", price: 500, emoji: "🩺", toothChart: false },
    { name: "Détartrage", category: "Prévention", price: 1500, emoji: "✨", toothChart: false },
    { name: "Composite", category: "Soins", price: 2500, emoji: "🦷", toothChart: true, subItems: [{ name: "1 face", price: 2000 }, { name: "2 faces", price: 2500 }, { name: "3 faces", price: 3000 }] },
    { name: "Extraction simple", category: "Chirurgie", price: 2000, emoji: "🔧", toothChart: true },
    { name: "Extraction dent de sagesse", category: "Chirurgie", price: 5000, emoji: "🔧", toothChart: true },
    { name: "Traitement canalaire", category: "Endodontie", price: 6000, emoji: "💉", toothChart: true, subItems: [{ name: "Monoradículée", price: 4500 }, { name: "Pluriradículée", price: 6500 }] },
    { name: "Couronne céramique", category: "Prothèse", price: 12000, emoji: "👑", toothChart: true },
    { name: "Blanchiment", category: "Esthétique", price: 8000, emoji: "😁", toothChart: false },
  ];
  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    const exists = await db.service.findFirst({ where: { name: s.name } });
    if (!exists) {
      await db.service.create({ data: { ...s, sortOrder: i + 1 } as never });
    }
  }

  /* ---- Booking windows ---- */
  if ((await db.bookingWindow.count()) === 0) {
    await db.bookingWindow.createMany({
      data: [
        { name: "Matin", mode: "FLEXIBLE", days: [1, 2, 3, 4, 5], start: "08:00", end: "12:00", capacity: 4, slotMinutes: 30 },
        { name: "Après-midi", mode: "EXACT_TIME", days: [1, 2, 3, 4, 5], start: "15:00", end: "19:00", capacity: 1, slotMinutes: 30 },
        { name: "Samedi", mode: "FLEXIBLE", days: [6], start: "09:00", end: "13:00", capacity: 3, slotMinutes: 30 },
      ],
    });
  }
  const morningWindow = await db.bookingWindow.findFirst({ where: { name: "Matin" } });

  /* ---- Patients ---- */
  const patientData = [
    { name: "Mohamed Ould Ahmed", phone: "+22236112233", age: 34, gender: "M" },
    { name: "Aicha Mint Sidi", phone: "+22236223344", age: 28, gender: "F" },
    { name: "Yacoub Diallo", phone: "+22236334455", age: 45, gender: "M" },
    { name: "Khadijetou Mint Ely", phone: "+22236445566", age: 8, gender: "F" },
    { name: "Cheikh Brahim", phone: "+22236556677", age: 52, gender: "M" },
  ];
  for (const p of patientData) {
    const exists = await db.patient.findFirst({ where: { phone: p.phone } });
    if (!exists) await db.patient.create({ data: p });
  }
  const patients = await db.patient.findMany();
  const composite = await db.service.findFirst({ where: { name: "Composite" } });
  const detartage = await db.service.findFirst({ where: { name: "Détartrage" } });

  /* ---- Bookings today ---- */
  const today = new Date(); today.setHours(9, 0, 0, 0);
  if ((await db.booking.count()) === 0) {
    await db.booking.createMany({
      data: [
        { patientId: patients[0].id, doctorId: doctorProfile.id, windowId: morningWindow?.id, date: today, time: "09:00", reason: "Contrôle annuel", status: "CONFIRMED" },
        { patientId: patients[1].id, doctorId: doctorProfile.id, windowId: morningWindow?.id, date: today, time: "09:30", reason: "Douleur dent 36", status: "IN_WAITING_ROOM" },
        { patientId: patients[2].id, doctorId: doctorProfile.id, date: today, time: "10:00", reason: "Détartrage", status: "PENDING_CONFIRMATION" },
      ],
    });
  }

  /* ---- A past visit with invoice + payments ---- */
  if ((await db.visit.count()) === 0) {
    const past = new Date(); past.setDate(past.getDate() - 10);
    const visit = await db.visit.create({
      data: {
        patientId: patients[0].id,
        doctorId: doctorProfile.id,
        servicesJson: [{ label: "Composite — 2 faces", price: 2500 }],
        teeth: [36],
        rawNotes: "carie 36 occlusal profonde, composite 2 faces ok",
        aiNotes: "• Carie occlusale profonde dent 36.\n• Restauration par composite (2 faces) réalisée sans complication.",
        finalNotes: "• Carie occlusale profonde dent 36.\n• Restauration par composite (2 faces) réalisée sans complication.",
        totalAmount: 2500,
        paidAmount: 1500,
        visitDate: past,
      },
    });
    const invoice = await db.invoice.create({
      data: {
        number: 1001,
        patientId: patients[0].id,
        itemsJson: [{ label: "Composite — 2 faces", qty: 1, unitPrice: 2500 }],
        subtotal: 2500,
        total: 2500,
        paid: 1500,
        status: "PARTIAL",
        createdAt: past,
      },
    });
    await db.payment.create({
      data: { invoiceId: invoice.id, patientId: patients[0].id, amount: 1500, method: "CASH", verified: true, createdAt: past },
    });
    void visit;
  }

  /* ---- Expenses & stock ---- */
  if ((await db.expense.count()) === 0) {
    const now = new Date();
    await db.expense.createMany({
      data: [
        { label: "Loyer du mois", amount: 35000, category: "Loyer", spentAt: now },
        { label: "Facture somelec", amount: 8500, category: "Électricité / Eau", spentAt: now },
        { label: "Publicité Facebook", amount: 4000, category: "Marketing", spentAt: now },
      ],
    });
  }
  if ((await db.stockItem.count()) === 0) {
    await db.stockItem.createMany({
      data: [
        { name: "Gants latex (boîte 100)", quantity: 12, lowStockThreshold: 5, unitType: "box", unitPrice: 450, supplier: "Pharmacie Centrale", purchaseDate: new Date() },
        { name: "Composite A2", quantity: 3, lowStockThreshold: 4, unitType: "syringe", unitPrice: 3200, supplier: "DentShop MRU", purchaseDate: new Date() },
        { name: "Masques chirurgicaux", quantity: 40, lowStockThreshold: 20, unitType: "piece", unitPrice: 25, supplier: "Pharmacie Centrale", purchaseDate: new Date() },
      ],
    });
  }

  console.log("✅ Seed terminé.");
  console.log("   Owner     :", owner.phone, "/ sir2026");
  console.log("   Doctor    :", doctorUser.phone, "/ sir2026");
  console.log("   Secretary :", secretary.phone, "/ sir2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
