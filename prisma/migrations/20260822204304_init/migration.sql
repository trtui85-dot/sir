-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'DOCTOR', 'SECRETARY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_WAITING_ROOM', 'IN_TREATMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('MANUAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "WindowMode" AS ENUM ('FLEXIBLE', 'EXACT_TIME');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANKILY', 'MASRIVI', 'BANK_TRANSFER', 'CREDIT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('FIXED_SALARY', 'SALARY_PLUS_PERCENT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUT', 'IN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "permissions" JSONB,
    "doctorProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "compensation" "CompensationType" NOT NULL DEFAULT 'FIXED_SALARY',
    "salaryAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "address" TEXT,
    "medicalBackground" TEXT,
    "doctorPreference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emoji" TEXT,
    "toothChart" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "subItems" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingWindow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "WindowMode" NOT NULL DEFAULT 'FLEXIBLE',
    "days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BookingWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "windowId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "reason" TEXT,
    "secretaryNotes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "source" "BookingSource" NOT NULL DEFAULT 'MANUAL',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "bookingId" TEXT,
    "servicesJson" JSONB NOT NULL DEFAULT '[]',
    "teeth" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rawNotes" TEXT,
    "aiNotes" TEXT,
    "finalNotes" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeVisit" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "itemsJson" JSONB NOT NULL DEFAULT '[]',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sessionsTotal" INTEGER NOT NULL DEFAULT 1,
    "sessionsDone" INTEGER NOT NULL DEFAULT 0,
    "sessionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToothCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tooth" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToothCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "itemsJson" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "patientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "screenshotUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "vendor" TEXT,
    "receiptNote" TEXT,
    "linkedPatientId" TEXT,
    "linkedDoctorId" TEXT,
    "isStockPurchase" BOOLEAN NOT NULL DEFAULT false,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Consumables',
    "unitType" TEXT NOT NULL DEFAULT 'piece',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "supplier" TEXT,
    "brandNote" TEXT,
    "batchNote" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "phone" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "pendingReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "clinicName" TEXT NOT NULL DEFAULT 'SIR',
    "headerTitle" TEXT NOT NULL DEFAULT 'Cabinet Dentaire SIR',
    "headerPhone" TEXT,
    "headerAddress" TEXT,
    "refundPolicy" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'fr',
    "childAgeLimit" INTEGER NOT NULL DEFAULT 12,
    "reminder1Hours" INTEGER NOT NULL DEFAULT 1,
    "reminder2Hours" INTEGER NOT NULL DEFAULT 48,
    "cancelHours" INTEGER NOT NULL DEFAULT 24,
    "adminPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportLanguage" TEXT NOT NULL DEFAULT 'fr',
    "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "useLetterhead" BOOLEAN NOT NULL DEFAULT false,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',

    CONSTRAINT "ClinicSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_doctorProfileId_key" ON "User"("doctorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ToothCondition_patientId_tooth_key" ON "ToothCondition"("patientId", "tooth");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_key" ON "MessageTemplate"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "BookingWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalNote" ADD CONSTRAINT "MedicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalNote" ADD CONSTRAINT "MedicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothCondition" ADD CONSTRAINT "ToothCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
