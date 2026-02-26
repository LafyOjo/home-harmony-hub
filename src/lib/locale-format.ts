import i18n from "@/i18n";

const LOCALE_MAP: Record<string, string> = {
  en: "en-GB",
  ar: "ar-SA",
  fr: "fr-FR",
  es: "es-ES",
  zh: "zh-CN",
  hi: "hi-IN",
};

function getLocale(): string {
  return LOCALE_MAP[i18n.language] || "en-GB";
}

/** Format currency in GBP with locale-aware number formatting */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a date string or Date object using locale-aware formatting */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(d);
}

/** Short date format (e.g. 26 Feb 2026) */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, { month: "short" });
}

/** Relative time (e.g. "3 days ago") */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });

  if (diffDay > 0) return rtf.format(-diffDay, "day");
  if (diffHr > 0) return rtf.format(-diffHr, "hour");
  if (diffMin > 0) return rtf.format(-diffMin, "minute");
  return rtf.format(-diffSec, "second");
}

/** Format a number using locale conventions */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), options).format(num);
}

/** Format area in sq ft or sq m depending on locale */
export function formatArea(sqft: number): string {
  const locale = getLocale();
  // UK and US use sq ft, others use sq m
  if (locale.startsWith("en")) {
    return `${formatNumber(sqft)} sq ft`;
  }
  const sqm = Math.round(sqft * 0.092903);
  return `${formatNumber(sqm)} m²`;
}
