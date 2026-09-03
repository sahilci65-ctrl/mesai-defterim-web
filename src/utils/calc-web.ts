// Web'e özgü hesaplama fonksiyonları
// Tüm sonuçlar "tahmini" olarak etiketlenir

import {
  TAX_BRACKETS,
  SGK_RATES,
  STAMP_TAX_RATE,
  getSeveranceCeiling,
  SEVERANCE_DAYS_PER_YEAR,
  NOTICE_PERIODS,
  OVERTIME_MULTIPLIER,
  WORKING_DAYS_PER_MONTH,
  DAYS_PER_MONTH_CALCULATION,
  MINIMUM_WAGE,
} from '../constants/parameters';

/**
 * MOBIL UYGULAMAYLA AYNI MODEL (Mesai-Defterim/src/services/calc.ts).
 * Iki taraf ayrisirsa ayni girdi farkli sonuc verir; bu yuzden formuller
 * birebir ayni tutulur ve calc-web.test.ts'teki senaryo testi bunu korur.
 *
 * - SGK isci payi %15 (emeklilik+saglik %14 + issizlik %1) TAM BRUT uzerinden.
 *   Asgari ucret istisnasi SGK'da UYGULANMAZ (mevzuat boyle).
 * - Gelir vergisi tek dilim %15; matrahtan asgari ucret matrahi dusulur
 *   (asgari ucret istisnasi).
 * - Damga vergisi asgari ucreti asan kisma uygulanir.
 */

// SGK kesintisi (isci payi): tam brut uzerinden %15
function calculateSGKDeduction(grossIncome: number): number {
  return Math.round(grossIncome * SGK_RATES.total * 100) / 100;
}

// Gelir vergisi: tek dilim, asgari ucret istisnali
function calculateIncomeTax(grossIncome: number): number {
  const taxableIncome = grossIncome - calculateSGKDeduction(grossIncome);
  const exemptBase = MINIMUM_WAGE * (1 - SGK_RATES.total);
  const tax = Math.max(0, (taxableIncome - exemptBase) * TAX_BRACKETS[0]!.rate);
  return Math.round(tax * 100) / 100;
}

// Brüt maaştan net maaş hesapla
export function calculateNetFromGross(
  grossIncome: number
): {
  gross: number;
  sgkDeduction: number;
  incomeTax: number;
  stampTax: number;
  net: number;
} {
  const sgkDeduction = calculateSGKDeduction(grossIncome);
  const incomeTax = calculateIncomeTax(grossIncome);

  // Damga vergisi: asgari ücreti aşan kısma (mobil ile aynı)
  const stampTax = Math.round(Math.max(0, grossIncome - MINIMUM_WAGE) * STAMP_TAX_RATE * 100) / 100;

  const net = Math.round((grossIncome - sgkDeduction - incomeTax - stampTax) * 100) / 100;

  return {
    gross: Math.round(grossIncome * 100) / 100,
    sgkDeduction: Math.round(sgkDeduction * 100) / 100,
    incomeTax: Math.round(incomeTax * 100) / 100,
    stampTax: Math.round(stampTax * 100) / 100,
    net: Math.max(net, 0), // Net negatif olamaz
  };
}

// Net maaştan brüt maaş hesapla (iteratif çözüm)
export function calculateGrossFromNet(
  netIncome: number
): {
  gross: number;
  sgkDeduction: number;
  incomeTax: number;
  stampTax: number;
  net: number;
} {
  // Ikili arama — MOBIL ile birebir ayni (calc.ts nettenBrute):
  // 60 adim, erken cikis YOK, sonuc alt/ust ortasi. Erken cikis veya farkli
  // adim sayisi kurusluk ayrisma yaratiyordu.
  let low = netIncome;
  let high = netIncome * 2.5;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (calculateNetFromGross(mid).net < netIncome) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return calculateNetFromGross(Math.round(((low + high) / 2) * 100) / 100);
}

// Kıdem tazminatı hesapla
export function calculateSeverance(
  monthlyGrossIncome: number,
  senioryYears: number,
  senioryMonths: number = 0,
  senioryDays: number = 0,
  exitDate?: string
): {
  totalDays: number;
  dailyGross: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Kıdem süresi yıl cinsinden (artık ay ve günler oranlı)
  const totalYears = senioryYears + senioryMonths / 12 + senioryDays / 365;

  // Ödemeye esas gün (her tam yıl = 30 gün)
  const totalDays = Math.round(totalYears * SEVERANCE_DAYS_PER_YEAR * 100) / 100;

  // İş Kanunu: kıdem tazminatı hakkı için en az 1 tam yıl çalışma şarttır.
  // 1 yıldan az kıdemde tazminat hakkı doğmaz → tutar 0.
  if (totalYears < 1) {
    return {
      totalDays,
      dailyGross: 0,
      grossAmount: 0,
      stampTax: 0,
      netAmount: 0,
    };
  }

  // Kıdeme esas yıllık ücret tavanla sınırlanır (çıkış tarihinin dönemine göre)
  const annualCap = getSeveranceCeiling(exitDate);
  const cappedAnnual = Math.min(monthlyGrossIncome, annualCap);

  // Günlük brüt = kıdeme esas yıllık / 30
  const dailyGross = Math.round((cappedAnnual / SEVERANCE_DAYS_PER_YEAR) * 100) / 100;

  // Brüt tazminat = kıdeme esas yıllık ücret × tam yıl (+ artık gün oranı)
  const grossAmount = Math.round(cappedAnnual * totalYears * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net = brüt - damga vergisi
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    totalDays: Math.round(totalDays * 100) / 100,
    dailyGross,
    grossAmount: Math.round(grossAmount * 100) / 100,
    stampTax,
    netAmount,
  };
}

// İhbar tazminatı hesapla
export function calculateNoticeSeverance(
  monthlyGrossIncome: number,
  senioryYears: number
): {
  noticeWeeks: number;
  noticeAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Kıdem yılına göre ihbar süresi
  let noticeWeeks = NOTICE_PERIODS.lessThan6Months;
  if (senioryYears >= 3) {
    noticeWeeks = NOTICE_PERIODS.threeYearsPlus;
  } else if (senioryYears >= 1) {
    noticeWeeks = NOTICE_PERIODS.yearToThreeYears;
  } else if (senioryYears >= 0.5) {
    noticeWeeks = NOTICE_PERIODS.sixMonthsToYear;
  }

  // İhbar tazminatı = haftalık ücret × hafta sayısı
  // Haftalık = aylık / 4.33
  const weeklyIncome = monthlyGrossIncome / 4.33;
  const noticeAmount = Math.round(weeklyIncome * noticeWeeks * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(noticeAmount * STAMP_TAX_RATE * 100) / 100;

  // Net
  const netAmount = Math.round((noticeAmount - stampTax) * 100) / 100;

  return {
    noticeWeeks,
    noticeAmount,
    stampTax,
    netAmount,
  };
}

// Fazla mesai ücreti hesapla
export function calculateOvertime(
  monthlyGrossIncome: number,
  overtimeHours: number
): {
  hourlyRate: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Saatlik ücret = aylık brüt / 225.
  // DIKKAT: tutar hesaplanirken YUVARLANMAMIS saatlik kullanilir; onceden
  // yuvarlanmis deger carpiliyordu ve mobil ile kurusluk fark cikiyordu.
  const hourlyExact = monthlyGrossIncome / WORKING_DAYS_PER_MONTH;
  const hourlyRate = Math.round(hourlyExact * 100) / 100;

  // Fazla mesai ücreti = saatlik × saat × 1.5
  const grossAmount = Math.round(hourlyExact * overtimeHours * OVERTIME_MULTIPLIER * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    hourlyRate,
    grossAmount,
    stampTax,
    netAmount,
  };
}

// Resmi tatil mesaisi ücreti hesapla
export function calculatePublicHolidayWork(
  monthlyGrossIncome: number,
  daysWorked: number
): {
  dailyRate: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Günlük ücret = aylık brüt / 30 (yuvarlanmamis deger carpilir — mobil ile ayni)
  const dailyExact = monthlyGrossIncome / DAYS_PER_MONTH_CALCULATION;
  const dailyRate = Math.round(dailyExact * 100) / 100;

  // Resmi tatilde çalışma = günlük × gün sayısı (ek ödeme)
  const grossAmount = Math.round(dailyExact * daysWorked * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    dailyRate,
    grossAmount,
    stampTax,
    netAmount,
  };
}

// Format para (₺ cinsinden)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
