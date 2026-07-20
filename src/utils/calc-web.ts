// Web'e özgü hesaplama fonksiyonları
// Tüm sonuçlar "tahmini" olarak etiketlenir

import {
  TAX_BRACKETS,
  SGK_RATES,
  STAMP_TAX_RATE,
  SEVERANCE_CAP_DAILY,
  SEVERANCE_DAYS_PER_YEAR,
  NOTICE_PERIODS,
  OVERTIME_MULTIPLIER,
  WORKING_DAYS_PER_MONTH,
  DAYS_PER_MONTH_CALCULATION,
  MINIMUM_WAGE,
  MINIMUM_WAGE_EXEMPTION,
} from '../constants/parameters';

// Gelir vergisi hesapla (kümülatif matrah)
function calculateIncomeTax(grossIncome: number): number {
  // SGK kesintisi
  const sgkDeduction = calculateSGKDeduction(grossIncome);
  const taxableIncome = grossIncome - sgkDeduction;

  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= previousLimit) break;

    const incomeInBracket = Math.min(taxableIncome, bracket.limit) - previousLimit;
    tax += incomeInBracket * bracket.rate;
    previousLimit = bracket.limit;
  }

  return Math.round(tax * 100) / 100;
}

// SGK kesintisi (işçi payı) hesapla
function calculateSGKDeduction(grossIncome: number): number {
  if (MINIMUM_WAGE_EXEMPTION && grossIncome <= MINIMUM_WAGE) {
    return 0; // Asgari ücrete kadar SGK kesintisi yok
  }

  const sgkBase = grossIncome > MINIMUM_WAGE ? grossIncome - MINIMUM_WAGE : 0;
  return Math.round(sgkBase * SGK_RATES.total * 100) / 100;
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

  // Damga vergisi (net üzerinden, ancak genelde brütün %0.759'u alınır)
  const stampTax = Math.round(grossIncome * STAMP_TAX_RATE * 100) / 100;

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
  // Binary search ile brütü bul
  let low = netIncome;
  let high = netIncome * 2;
  let gross = netIncome;

  for (let i = 0; i < 50; i++) {
    gross = (low + high) / 2;
    const result = calculateNetFromGross(gross);

    if (Math.abs(result.net - netIncome) < 0.01) {
      break;
    }

    if (result.net < netIncome) {
      low = gross;
    } else {
      high = gross;
    }
  }

  return calculateNetFromGross(gross);
}

// Kıdem tazminatı hesapla
export function calculateSeverance(
  monthlyGrossIncome: number,
  senioryYears: number,
  senioryMonths: number = 0,
  senioryDays: number = 0
): {
  totalDays: number;
  dailyGross: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Toplam gün cinsinden kıdem
  const totalDays = senioryYears * SEVERANCE_DAYS_PER_YEAR +
                    (senioryMonths / 12) * SEVERANCE_DAYS_PER_YEAR +
                    senioryDays;

  // Günlük brüt = aylık brüt / 30
  const dailyGross = Math.round((monthlyGrossIncome / 30) * 100) / 100;

  // Brüt tazminat (tavanla sınırlı)
  let grossAmount = dailyGross * totalDays;
  const cappedAmount = SEVERANCE_CAP_DAILY * totalDays;
  if (grossAmount > cappedAmount) {
    grossAmount = cappedAmount;
  }

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
  // Saatlik ücret = aylık / 225
  const hourlyRate = Math.round((monthlyGrossIncome / WORKING_DAYS_PER_MONTH) * 100) / 100;

  // Fazla mesai ücreti = saatlik × saat × 1.5
  const grossAmount = Math.round(hourlyRate * overtimeHours * OVERTIME_MULTIPLIER * 100) / 100;

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
  // Günlük ücret = aylık / 30
  const dailyRate = Math.round((monthlyGrossIncome / DAYS_PER_MONTH_CALCULATION) * 100) / 100;

  // Resmi tatilde çalışma = günlük × gün sayısı (ek ödeme)
  const grossAmount = Math.round(dailyRate * daysWorked * 100) / 100;

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
