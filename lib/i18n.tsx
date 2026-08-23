"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "fr" | "ar";

const dict: Record<string, { fr: string; ar: string }> = {
  // App / portals
  app_name: { fr: "SIR", ar: "سير" },
  tagline: { fr: "Portail Patients & Personnel", ar: "بوابة المرضى والموظفين" },
  select_portal: { fr: "Choisissez votre portail", ar: "اختر بوابتك" },
  secretary: { fr: "Secrétaire", ar: "السكرتيرة" },
  doctor: { fr: "Médecin", ar: "الطبيب" },
  clinic_owner: { fr: "Propriétaire de clinique", ar: "صاحب العيادة" },
  secretary_desc: { fr: "Gérer les rendez-vous et les tâches cliniques.", ar: "إدارة المواعيد والمهام السريرية." },
  doctor_desc: { fr: "Gérer les consultations et les dossiers patients.", ar: "إدارة الاستشارات وملفات المرضى." },
  owner_desc: { fr: "Piloter toute la clinique : finances, équipe, stock.", ar: "إدارة العيادة بالكامل: المالية، الفريق، المخزون." },
  select: { fr: "Sélectionner", ar: "اختر" },

  // Login
  sign_in: { fr: "Se connecter", ar: "تسجيل الدخول" },
  phone_number: { fr: "Numéro de téléphone", ar: "رقم الهاتف" },
  password: { fr: "Mot de passe", ar: "كلمة المرور" },
  choose_another_portal: { fr: "Choisir un autre portail", ar: "اختيار بوابة أخرى" },
  forgot_password: { fr: "Mot de passe oublié ? Contactez le propriétaire.", ar: "نسيت كلمة المرور؟ اتصل بمالك العيادة." },
  invalid_credentials: { fr: "Téléphone ou mot de passe incorrect.", ar: "الهاتف أو كلمة المرور غير صحيحة." },
  portal: { fr: "Portail", ar: "البوابة" },

  // Nav common
  dashboard: { fr: "Tableau de bord", ar: "لوحة القيادة" },
  today: { fr: "Aujourd'hui", ar: "اليوم" },
  bookings: { fr: "Rendez-vous", ar: "المواعيد" },
  patients: { fr: "Patients", ar: "المرضى" },
  payments: { fr: "Paiements", ar: "المدفوعات" },
  messages: { fr: "Messages", ar: "الرسائل" },
  schedule: { fr: "Planning", ar: "الجدول" },
  my_patients: { fr: "Mes dossiers", ar: "ملفاتي" },
  my_stats: { fr: "Mes stats", ar: "إحصائياتي" },
  accounting: { fr: "Comptabilité", ar: "المحاسبة" },
  expenses: { fr: "Dépenses", ar: "المصروفات" },
  stock: { fr: "Stock", ar: "المخزون" },
  staff: { fr: "Équipe", ar: "الفريق" },
  services: { fr: "Services", ar: "الخدمات" },
  windows: { fr: "Créneaux", ar: "الفترات" },
  doctors: { fr: "Médecins", ar: "الأطباء" },
  settings: { fr: "Paramètres", ar: "الإعدادات" },
  sign_out: { fr: "Déconnexion", ar: "خروج" },
  broadcast: { fr: "Diffusion", ar: "البث" },
  bot_flow: { fr: "Bot WhatsApp", ar: "بوت واتساب" },
  import_patients: { fr: "Importer patients", ar: "استيراد المرضى" },

  // Generic
  save: { fr: "Enregistrer", ar: "حفظ" },
  cancel: { fr: "Annuler", ar: "إلغاء" },
  edit: { fr: "Modifier", ar: "تعديل" },
  delete: { fr: "Supprimer", ar: "حذف" },
  close: { fr: "Fermer", ar: "إغلاق" },
  search: { fr: "Rechercher…", ar: "بحث..." },
  name: { fr: "Nom", ar: "الاسم" },
  phone: { fr: "Téléphone", ar: "الهاتف" },
  age: { fr: "Âge", ar: "العمر" },
  date: { fr: "Date", ar: "التاريخ" },
  time: { fr: "Heure", ar: "الوقت" },
  amount: { fr: "Montant", ar: "المبلغ" },
  total: { fr: "Total", ar: "المجموع" },
  status: { fr: "Statut", ar: "الحالة" },
  actions: { fr: "Actions", ar: "إجراءات" },
  notes: { fr: "Notes", ar: "ملاحظات" },
  note: { fr: "Note", ar: "ملاحظة" },
  category: { fr: "Catégorie", ar: "الفئة" },
  price: { fr: "Prix", ar: "السعر" },
  add: { fr: "Ajouter", ar: "إضافة" },
  confirm: { fr: "Confirmer", ar: "تأكيد" },
  reject: { fr: "Rejeter", ar: "رفض" },
  print: { fr: "Imprimer", ar: "طباعة" },
  loading: { fr: "Chargement…", ar: "جار التحميل..." },
  saved: { fr: "Enregistré.", ar: "تم الحفظ." },
  error_occurred: { fr: "Une erreur est survenue", ar: "حدث خطأ" },
  all: { fr: "Tous", ar: "الكل" },
  none: { fr: "Aucun", ar: "لا شيء" },
  language: { fr: "Langue", ar: "اللغة" },
  theme: { fr: "Thème", ar: "المظهر" },
  welcome: { fr: "Bienvenue", ar: "مرحباً" },
  optional: { fr: "optionnel", ar: "اختياري" },
  required: { fr: "obligatoire", ar: "مطلوب" },
  description: { fr: "Description", ar: "الوصف" },
  quantity: { fr: "Quantité", ar: "الكمية" },
  supplier: { fr: "Fournisseur", ar: "المورد" },
  method: { fr: "Méthode", ar: "الطريقة" },
  reason: { fr: "Motif", ar: "السبب" },
  view: { fr: "Voir", ar: "عرض" },
  open_profile: { fr: "Ouvrir le dossier", ar: "فتح الملف" },
  back: { fr: "Retour", ar: "رجوع" },
  send: { fr: "Envoyer", ar: "إرسال" },
  sent: { fr: "Envoyé", ar: "أرسلت" },
  export_csv: { fr: "Exporter CSV", ar: "تصدير CSV" },
  no_data: { fr: "Aucune donnée pour le moment.", ar: "لا توجد بيانات حالياً." },
  filters: { fr: "Filtres", ar: "عوامل التصفية" },
  created_by: { fr: "Créé par", ar: "أنشئ بواسطة" },
  history: { fr: "Historique", ar: "التاريخ" },

  // Roles
  role_owner: { fr: "Propriétaire", ar: "المالك" },
  role_doctor: { fr: "Médecin", ar: "طبيب" },
  role_secretary: { fr: "Secrétaire", ar: "سكرتيرة" },

  // Dashboard KPIs
  patients_today: { fr: "Patients aujourd'hui", ar: "مرضى اليوم" },
  revenue_this_month: { fr: "Revenus ce mois-ci", ar: "إيرادات هذا الشهر" },
  expenses_this_month: { fr: "Dépenses ce mois-ci", ar: "مصروفات هذا الشهر" },
  profit_this_month: { fr: "Bénéfice ce mois-ci", ar: "ربح هذا الشهر" },
  pending_payments: { fr: "Paiements en attente", ar: "مدفوعات معلقة" },
  active_queue: { fr: "File active", ar: "قائمة الانتظار" },
  new_patients: { fr: "Nouveaux patients", ar: "مرضى جدد" },
  all_statuses: { fr: "Tous les statuts", ar: "جميع الحالات" },
  confirm_delete: { fr: "Confirmer la suppression ?", ar: "تأكيد الحذف؟" },
  deleted: { fr: "Supprimé.", ar: "تم الحذف." },
  min_stock: { fr: "Seuil d'alerte", ar: "حد التنبيه" },
  upcoming: { fr: "À venir", ar: "القادمة" },
  quick_stats: { fr: "Stats rapides", ar: "إحصائيات سريعة" },
  revenue_trend_12m: { fr: "Évolution des recettes sur 12 mois", ar: "تطور الإيرادات خلال 12 شهراً" },
  revenue_by_service: { fr: "Revenus par service", ar: "الإيرادات حسب الخدمة" },
  collection_rate: { fr: "Taux d'encaissement", ar: "معدل التحصيل" },
  total_collected: { fr: "Total encaissé", ar: "إجمالي محصل" },
  still_to_collect: { fr: "Reste à encaisser", ar: "المتبقي تحصيله" },
  workload_today: { fr: "Charge aujourd'hui", ar: "حجم العمل اليوم" },
  doctor_performance: { fr: "Performance des médecins", ar: "أداء الأطباء" },
  patients_seen: { fr: "Patients vus", ar: "المرضى الذين تمت رؤيتهم" },
  avg_per_visit: { fr: "Moyenne par visite", ar: "متوسط لكل زيارة" },

  // Queue / Today
  todays_queue: { fr: "File du jour", ar: "قائمة اليوم" },
  check_in: { fr: "Enregistrer l'arrivée", ar: "تسجيل الوصول" },
  start_treatment: { fr: "Commencer", ar: "بدء" },
  mark_complete: { fr: "Marquer terminé", ar: "وضعلام منتهياً" },
  waiting_room: { fr: "Salle d'attente", ar: "غرفة الانتظار" },
  in_treatment: { fr: "En traitement", ar: "في العلاج" },
  completed_today: { fr: "Terminés aujourd'hui", ar: "منتهية اليوم" },
  register_walkin: { fr: "Inscrire sans RDV", ar: "تسجيل بدون موعد" },
  next_patient: { fr: "Prochain patient", ar: "المريض التالي" },
  arrival_check: { fr: "Vérification d'arrivée", ar: "التحقق من الوصول" },
  print_daily_sheet: { fr: "Imprimer la feuille du jour", ar: "طباعة ورقة اليوم" },

  // Bookings
  new_booking: { fr: "Nouvelle consultation", ar: "موعد جديد" },
  edit_booking: { fr: "Modifier la consultation", ar: "تعديل الموعد" },
  choose_patient: { fr: "Choisir un patient", ar: "اختيار مريض" },
  create_new_patient: { fr: "Créer nouveau patient", ar: "إنشاء مريض جديد" },
  choose_service: { fr: "Choisir un service", ar: "اختيار خدمة" },
  choose_doctor: { fr: "Choisir un médecin", ar: "اختيار طبيب" },
  choose_window: { fr: "Choisir un créneau", ar: "اختيار فترة" },
  booking_created: { fr: "Consultation créée.", ar: "تم إنشاء الموعد." },
  booking_updated: { fr: "Consultation mise à jour.", ar: "تم تحديث الموعد." },
  booking_deleted: { fr: "Consultation supprimée.", ar: "تم حذف الموعد." },
  cancel_booking: { fr: "Annuler la consultation", ar: "إلغاء الموعد" },
  cancellation_reason: { fr: "Motif d'annulation", ar: "سبب الإلغاء" },
  mark_noshow: { fr: "Marquer absent", ar: "علما كغائب" },
  pending_confirmation: { fr: "Confirmation en attente", ar: "بانتظار التأكيد" },
  confirmed: { fr: "Confirmé", ar: "مؤكد" },
  cancelled: { fr: "Annulé", ar: "ملغى" },
  no_show: { fr: "Absent", ar: "غائب" },
  source_whatsapp: { fr: "WhatsApp", ar: "واتساب" },
  source_manual: { fr: "Manuel", ar: "يدوي" },
  secretary_notes: { fr: "Notes pour la secrétaire", ar: "ملاحظات للسكرتيرة" },

  // Windows
  window_name: { fr: "Nom du créneau", ar: "اسم الفترة" },
  mode_flexible: { fr: "Matin/Après-midi avec capacité", ar: "صباح/بعد الظهر مع سعة" },
  mode_exact: { fr: "Heure précise", ar: "وقت محدد" },
  working_days: { fr: "Jours de travail", ar: "أيام العمل" },
  max_slots: { fr: "Places max", ar: "أقصى عدد" },
  slot_minutes: { fr: "Durée (min)", ar: "المدة (دقيقة)" },
  window_created: { fr: "Créneau créé.", ar: "تم إنشاء الفترة." },

  // Patients
  patient_directory: { fr: "Répertoire des patients", ar: "دليل المرضى" },
  register_patient: { fr: "Enregistrer un patient", ar: "تسجيل مريض" },
  patient_registered: { fr: "Patient enregistré.", ar: "تم تسجيل المريض." },
  patient_updated: { fr: "Détails enregistrés.", ar: "تم حفظ التفاصيل." },
  medical_background: { fr: "Antécédents médicaux", ar: "التاريخ الطبي" },
  deactivate: { fr: "Désactiver", ar: "تعطيل" },
  reactivate: { fr: "Réactiver", ar: "تنشيط" },
  active: { fr: "Actif", ar: "نشط" },
  inactive: { fr: "Inactif", ar: "غير نشط" },
  last_visit: { fr: "Dernière visite", ar: "آخر زيارة" },
  visits_count: { fr: "Visites", ar: "الزيارات" },
  import_excel: { fr: "Importer Excel/CSV", ar: "استيراد Excel/CSV" },
  paste_list: { fr: "Coller une liste (un patient par ligne)", ar: "لصق قائمة (مريض لكل سطر)" },
  imported: { fr: "Importés", ar: "تم استيرادهم" },
  gender_m: { fr: "Homme", ar: "ذكر" },
  gender_f: { fr: "Femme", ar: "أنثى" },

  // Patient profile
  patient_file: { fr: "Dossier patient", ar: "ملف المريض" },
  info: { fr: "Infos", ar: "معلومات" },
  dental_chart: { fr: "Schéma dentaire", ar: "مخطط الأسنان" },
  treatments: { fr: "Traitements", ar: "العلاجات" },
  prescriptions: { fr: "Ordonnances", ar: "الوصفات" },
  finances: { fr: "Finances", ar: "المالية" },
  visit_history: { fr: "Historique des visites", ar: "سجل الزيارات" },
  documents: { fr: "Documents", ar: "المستندات" },
  adult_teeth: { fr: "Dents adultes", ar: "أسنان البالغين" },
  baby_teeth: { fr: "Dents de lait", ar: "أسنان اللبن" },
  upper_jaw: { fr: "Mâchoire supérieure", ar: "الفك العلوي" },
  lower_jaw: { fr: "Mâchoire inférieure", ar: "الفك السفلي" },
  tap_teeth: { fr: "Appuyez sur les dents pour les sélectionner", ar: "اضغط على الأسنان لاختيارها" },
  condition: { fr: "État", ar: "الحالة" },
  healthy: { fr: "Sain", ar: "سليم" },
  caries: { fr: "Carie", ar: "تسوس" },
  filled: { fr: "Obturé", ar: "محشو" },
  extracted: { fr: "Extrait", ar: "مخلوع" },
  crown: { fr: "Couronne", ar: "تاج" },
  implant: { fr: "Implant", ar: "زرعة" },
  root_canal: { fr: "Traitement de canal", ar: "علاج جذور" },
  missing: { fr: "Absente", ar: "مفقودة" },
  save_conditions: { fr: "Enregistrer les états", ar: "حفظ الحالات" },
  conditions_saved: { fr: "États dentaires enregistrés.", ar: "تم حفظ حالات الأسنان." },
  add_note_medical: { fr: "Ajouter une note médicale", ar: "إضافة ملاحظة طبية" },
  past_prescriptions: { fr: "Ordonnances passées", ar: "الوصفات السابقة" },
  new_prescription: { fr: "Nouvelle ordonnance", ar: "وصفة جديدة" },
  prescription_content: { fr: "Contenu (médicament, posologie, durée)", ar: "المحتوى (الدواء، الجرعة، المدة)" },
  financial_summary: { fr: "Résumé financier", ar: "الملخص المالي" },
  total_billed: { fr: "Total facturé", ar: "إجمالي الفواتير" },
  total_paid: { fr: "Total payé", ar: "إجمالي المدفوع" },
  balance_due: { fr: "Solde restant", ar: "الرصيد المتبقي" },

  // Consultation
  new_consultation: { fr: "Nouvelle consultation", ar: "استشارة جديدة" },
  consultation_for: { fr: "Consultation pour", ar: "استشارة لـ" },
  raw_notes: { fr: "Notes brutes du médecin", ar: "ملاحظات الطبيب الخام" },
  ai_clean: { fr: "Nettoyer avec l'IA", ar: "تنظيف بالذكاء الاصطناعي" },
  ai_suggestion: { fr: "Suggestion IA (modifiable)", ar: "اقتراح الذكاء الاصطناعي (قابل للتعديل)" },
  professional_summary: { fr: "Résumé professionnel IA", ar: "ملخص احترافي" },
  save_finish_visit: { fr: "Enregistrer et terminer la visite", ar: "حفظ وإنهاء الزيارة" },
  affected_teeth: { fr: "Dents concernées", ar: "الأسنان المعنية" },
  custom_services: { fr: "Services personnalisés (cette visite)", ar: "خدمات مخصصة (هذه الزيارة)" },
  visit_saved: { fr: "Visite enregistrée.", ar: "تم حفظ الزيارة." },
  free_visit: { fr: "Visite gratuite", ar: "زيارة مجانية" },
  visits_history: { fr: "Historique des visites", ar: "سجل الزيارات" },

  // Treatment plans
  treatment_plan: { fr: "Plan de traitement", ar: "خطة العلاج" },
  new_plan: { fr: "Nouveau plan", ar: "خطة جديدة" },
  sessions_total: { fr: "Nombre de séances", ar: "عدد الجلسات" },
  session_amount: { fr: "Montant par séance", ar: "مبلغ الجلسة" },
  sessions_done: { fr: "Séances effectuées", ar: "الجلسات المنجزة" },
  plan_in_progress: { fr: "En cours", ar: "قيد التنفيذ" },
  plan_completed: { fr: "Terminé", ar: "مكتمل" },
  plan_cancelled: { fr: "Annulé", ar: "ملغى" },

  // Payments & invoices
  payment_verification: { fr: "Vérification des paiements", ar: "التحقق من المدفوعات" },
  record_payment: { fr: "Enregistrer le paiement", ar: "تسجيل الدفعة" },
  payment_recorded: { fr: "Paiement enregistré.", ar: "تم تسجيل الدفعة." },
  verify: { fr: "Valider", ar: "اعتماد" },
  void_payment: { fr: "Annuler le paiement", ar: "إلغاء الدفعة" },
  partial_payment: { fr: "Paiement partiel", ar: "دفعة جزئية" },
  paid_in_full: { fr: "Payé intégralement", ar: "مدفوع بالكامل" },
  unpaid: { fr: "Non payé", ar: "غير مدفوع" },
  partially_paid: { fr: "Partiellement payé", ar: "مدفوع جزئياً" },
  cash: { fr: "Espèces", ar: "نقداً" },
  bankily: { fr: "Bankily", ar: "بنكيلي" },
  masrivi: { fr: "Masrivi", ar: "مسريفي" },
  bank_transfer: { fr: "Virement bancaire", ar: "حوالة بنكية" },
  credit: { fr: "Crédit", ar: "ائتمان" },
  new_invoice: { fr: "Nouvelle facture", ar: "فاتورة جديدة" },
  invoice_number: { fr: "Facture", ar: "فاتورة" },
  subtotal: { fr: "Sous-total", ar: "المجموع الفرعي" },
  discount: { fr: "Remise", ar: "خصم" },
  final_total: { fr: "Total final", ar: "المجموع النهائي" },
  amount_paid: { fr: "Montant payé", ar: "المبلغ المدفوع" },
  remaining: { fr: "Reste", ar: "المتبقي" },
  invoice_created: { fr: "Facture créée.", ar: "تم إنشاء الفاتورة." },
  receipt: { fr: "Reçu", ar: "إيصال" },
  estimate: { fr: "Devis", ar: "عرض سعر" },
  print_receipt: { fr: "Imprimer le reçu", ar: "طباعة الإيصال" },

  // Expenses
  add_expense: { fr: "Ajouter une dépense", ar: "إضافة مصروف" },
  expense_label: { fr: "Libellé", ar: "التسمية" },
  vendor: { fr: "Fournisseur", ar: "المورد" },
  spent_at: { fr: "Date", ar: "التاريخ" },
  expense_saved: { fr: "Dépense ajoutée.", ar: "تمت إضافة المصروف." },
  expenses_by_category: { fr: "Dépenses par catégorie", ar: "المصروفات حسب الفئة" },
  cat_supplies: { fr: "Fournitures médicales", ar: "مستلزمات طبية" },
  cat_lab: { fr: "Laboratoire", ar: "مختبر" },
  cat_rent: { fr: "Loyer", ar: "إيجار" },
  cat_salary: { fr: "Salaires", ar: "رواتب" },
  cat_equipment: { fr: "Équipement", ar: "معدات" },
  cat_marketing: { fr: "Marketing", ar: "تسويق" },
  cat_other: { fr: "Autre", ar: "أخرى" },

  // Stock
  add_stock_item: { fr: "Ajouter un article", ar: "إضافة عنصر" },
  item_name: { fr: "Nom de l'article", ar: "اسم العنصر" },
  unit_type: { fr: "Type d'unité", ar: "نوع الوحدة" },
  low_stock_warning: { fr: "Alerte stock bas", ar: "تنبيه نقص المخزون" },
  low_stock_only: { fr: "Stock bas uniquement", ar: "نقص فقط" },
  stock_saved: { fr: "Article enregistré.", ar: "تم حفظ العنصر." },
  record_usage: { fr: "Enregistrer l'utilisation", ar: "تسجيل الاستخدام" },
  restock: { fr: "Réapprovisionner", ar: "إعادة التموين" },
  purchase_date: { fr: "Date d'achat", ar: "تاريخ الشراء" },
  unit_price: { fr: "Prix unitaire", ar: "سعر الوحدة" },

  // Staff
  staff_management: { fr: "Gestion du personnel", ar: "إدارة الموظفين" },
  add_staff: { fr: "Ajouter un compte", ar: "إضافة حساب" },
  login_phone: { fr: "Téléphone de connexion", ar: "هاتف تسجيل الدخول" },
  linked_doctor_profile: { fr: "Profil médecin lié", ar: "ملف الطبيب المرتبط" },
  permissions: { fr: "Permissions", ar: "الأذونات" },
  can_edit_patients: { fr: "Peut modifier les patients", ar: "يمكن تعديل المرضى" },
  can_view_notes: { fr: "Peut voir les notes médicales", ar: "يمكن رؤية الملاحظات الطبية" },
  can_view_accounting: { fr: "Accès comptabilité", ar: "وصول للمحاسبة" },
  can_upload_docs: { fr: "Peut téléverser des documents", ar: "يمكن رفع مستندات" },
  staff_saved: { fr: "Compte créé.", ar: "تم إنشاء الحساب." },
  staff_payments_tab: { fr: "Paiements du personnel", ar: "مدفوعات الموظفين" },
  how_paid: { fr: "Mode de paiement", ar: "طريقة الدفع" },
  fixed_salary: { fr: "Salaire fixe", ar: "راتب ثابت" },
  salary_plus_percent: { fr: "Salaire + %", ar: "راتب + ٪" },
  monthly_salary: { fr: "Salaire mensuel", ar: "الراتب الشهري" },
  percent_rate: { fr: "Pourcentage", ar: "النسبة" },
  compensation: { fr: "Rémunération", ar: "الأجر" },

  // Doctors
  doctor_profiles: { fr: "Profils des médecins", ar: "ملفات الأطباء" },
  add_doctor: { fr: "Ajouter un médecin", ar: "إضافة طبيب" },
  specialty: { fr: "Spécialité", ar: "التخصص" },
  doctor_saved: { fr: "Médecin enregistré.", ar: "تم حفظ الطبيب." },
  clinical_stats: { fr: "Stats cliniques et financières", ar: "إحصائيات سريرية ومالية" },

  // Services
  services_pricing: { fr: "Services et tarifs", ar: "الخدمات والأسعار" },
  add_service: { fr: "Ajouter un service", ar: "إضافة خدمة" },
  tooth_chart_service: { fr: "Afficher le schéma dentaire", ar: "عرض مخطط الأسنان" },
  public_catalog: { fr: "Visible dans la réservation WhatsApp", ar: "مرئي في حجز واتساب" },
  hide_service: { fr: "Masquer", ar: "إخفاء" },
  show_hidden: { fr: "Afficher les services masqués", ar: "إظهار الخدمات المخفية" },
  service_saved: { fr: "Service enregistré.", ar: "تم حفظ الخدمة." },
  sub_items: { fr: "Sous-éléments", ar: "العناصر الفرعية" },

  // Settings
  clinic_settings: { fr: "Paramètres de la clinique", ar: "إعدادات العيادة" },
  general_config: { fr: "Configuration générale", ar: "الإعداد العام" },
  clinic_name: { fr: "Nom de la clinique", ar: "اسم العيادة" },
  header_title: { fr: "Titre de l'en-tête", ar: "عنوان الترويسة" },
  header_phone: { fr: "Téléphone (en-tête)", ar: "هاتف (ترويسة)" },
  header_address: { fr: "Adresse (en-tête)", ar: "العنوان (ترويسة)" },
  child_age_limit: { fr: "Âge limite enfant", ar: "حد عمر الطفل" },
  settings_saved: { fr: "Paramètres mis à jour.", ar: "تم تحديث الإعدادات." },
  whatsapp_notifications: { fr: "Notifications WhatsApp", ar: "إشعارات واتساب" },
  whatsapp_connection: { fr: "Connexion WhatsApp", ar: "اتصال واتساب" },
  message_templates: { fr: "Modèles de messages", ar: "قوالب الرسائل" },
  template_welcome: { fr: "Message de bienvenue", ar: "رسالة ترحيب" },
  template_booking: { fr: "Confirmation de rendez-vous", ar: "تأكيد الموعد" },
  template_cancellation: { fr: "Notification d'annulation", ar: "إشعار الإلغاء" },
  template_reschedule: { fr: "Notification de changement", ar: "إشعار التغيير" },
  template_payment_reminder: { fr: "Rappel de paiement", ar: "تذكير بالدفع" },
  template_session_reminder: { fr: "Rappel de séance", ar: "تذكير الجلسة" },
  variables_hint: { fr: "Variables : {{name}}, {{clinic}}, {{date}}, {{time}}", ar: "المتغيرات: {{name}}، {{clinic}}، {{date}}، {{time}}" },
  reminder_hours: { fr: "Rappels automatiques (heures avant)", ar: "تذكيرات تلقائية (ساعات قبل)" },
  admin_phones: { fr: "Numéros admin (rapports auto)", ar: "أرقام المشرف (تقارير)" },
  automated_reports: { fr: "Rapports automatisés", ar: "تقارير آلية" },
  danger_zone: { fr: "Zone de danger", ar: "منطقة الخطر" },

  // Messages
  conversations: { fr: "Conversations", ar: "المحادثات" },
  broadcast_center: { fr: "Centre de diffusion", ar: "مركز البث" },
  send_to_all_patients: { fr: "Envoyer à tous les patients", ar: "إرسال لجميع المرضى" },
  send_to_one_patient: { fr: "Envoyer à un patient", ar: "إرسال لمريض واحد" },
  message_content: { fr: "Contenu du message", ar: "محتوى الرسالة" },
  estimated_reach: { fr: "Portée estimée", ar: "الوصول المتوقع" },
  recipients_skipped: { fr: "Ignorés (sans téléphone)", ar: "تجاهل (بدون هاتف)" },
  broadcast_sent: { fr: "Diffusion envoyée.", ar: "تم إرسال البث." },
  bot_preview: { fr: "Aperçu du bot", ar: "معاينة البوت" },
  bot_flow_desc: { fr: "Les patients écrivent au numéro WhatsApp et réservent via le bot.", ar: "يكتب المرضى إلى رقم واتساب ويحجزون عبر البوت." },
  type_message: { fr: "Écrire un message…", ar: "اكتب رسالة..." },
  media_message: { fr: "Message média", ar: "رسالة وسائط" },

  // Status words
  status_new: { fr: "Nouveau", ar: "جديد" },
  seen: { fr: "Vu", ar: "شوهد" },

  // AI assistant
  ai_chat: { fr: "Chat IA", ar: "محادثة الذكاء الاصطناعي" },
  ask_anything: { fr: "Posez une question sur vos données cliniques…", ar: "اطرح سؤالاً عن بيانات عيادتك..." },
  suggested_questions: { fr: "Questions suggérées", ar: "أسئلة مقترحة" },

  days: { fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as unknown as string, ar: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] as unknown as string },

  // PWA install
  install_app: { fr: "Installer l'application", ar: "تثبيت التطبيق" },
  install_hint: { fr: "Ajoutez SIR à votre écran d'accueil pour un accès rapide.", ar: "أضف سير إلى شاشتك الرئيسية للوصول السريع." },
  ios_install_hint: { fr: "Sur iPhone : appuyez sur le bouton Partager puis « Sur l'écran d'accueil ».", ar: "على الآيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»." },
  not_now: { fr: "Plus tard", ar: "لاحقاً" },
};

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<Ctx>({
  lang: "fr",
  dir: "ltr",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("sir_lang")) as Lang | null;
    if (stored === "ar" || stored === "fr") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sir_lang", l);
  };

  const t = (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return (entry as unknown as Record<Lang, string>)[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export function formatMoney(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} MRU`;
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
