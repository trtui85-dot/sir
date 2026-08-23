"use client";

import { useLanguage } from "@/lib/i18n";

const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const BABY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const BABY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const TOOTH_CONDITIONS = [
  { value: "healthy", fr: "Sain", ar: "سليم" },
  { value: "caries", fr: "Carie", ar: "تسوس" },
  { value: "filled", fr: "Obturé", ar: "محشو" },
  { value: "extracted", fr: "Extrait", ar: "مخلوع" },
  { value: "crown", fr: "Couronne", ar: "تاج" },
  { value: "implant", fr: "Implant", ar: "زرعة" },
  { value: "root_canal", fr: "Traitement de canal", ar: "علاج جذور" },
  { value: "missing", fr: "Absente", ar: "مفقودة" },
];

export function ToothChart({
  selected,
  conditions,
  onToggle,
  baby,
}: {
  selected?: number[];
  conditions?: Record<number, string>;
  onToggle?: (tooth: number) => void;
  baby?: boolean;
}) {
  const { t } = useLanguage();

  function row(teeth: number[]) {
    return (
      <div className="flex flex-wrap justify-center gap-1">
        {teeth.map((tooth) => {
          const cond = conditions?.[tooth];
          const isSel = selected?.includes(tooth);
          return (
            <button
              key={tooth}
              type="button"
              className={`tooth ${baby ? "baby" : ""} ${isSel ? "selected" : ""} ${
                cond && cond !== "healthy" ? `tooth-cond-${cond}` : ""
              }`}
              onClick={() => onToggle?.(tooth)}
              title={cond && cond !== "healthy" ? t(cond) : String(tooth)}
            >
              {tooth}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">{t("upper_jaw")}</p>
      {baby ? (
        <>
          {row(BABY_UPPER)}
          <div className="h-px bg-[var(--border)] my-2 max-w-xs mx-auto" />
          {row(BABY_LOWER)}
        </>
      ) : (
        <>
          {row(ADULT_UPPER)}
          <div className="h-px bg-[var(--border)] my-2 max-w-md mx-auto" />
          {row(ADULT_LOWER)}
        </>
      )}
      <p className="text-center text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">{t("lower_jaw")}</p>
    </div>
  );
}
