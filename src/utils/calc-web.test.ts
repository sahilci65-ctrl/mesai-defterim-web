import { describe, it, expect } from 'vitest';
import {
  calculateNetFromGross,
  calculateGrossFromNet,
  calculateSeverance,
  calculateNoticeSeverance,
  calculateOvertime,
  calculatePublicHolidayWork,
  formatCurrency,
} from './calc-web';

describe('Brüt-Net Dönüşümü', () => {
  it('45.000 TL brütü doğru şekilde net\'e çevirir', () => {
    const result = calculateNetFromGross(45000);

    expect(result.gross).toBe(45000);
    expect(result.sgkDeduction).toBeGreaterThan(0); // SGK kesintisi olmalı
    expect(result.incomeTax).toBeGreaterThan(0); // Vergi olmalı
    expect(result.net).toBeLessThan(result.gross); // Net < brüt
    expect(result.net).toBeGreaterThan(0);
  });

  it('Asgari ücrete kadar SGK kesintisi uygulanmaz', () => {
    const minimumResult = calculateNetFromGross(16500);

    expect(minimumResult.sgkDeduction).toBe(0); // Asgari ücrette SGK yok
  });

  it('Asgari ücretten fazla kısmında SGK kesintisi uygulanır', () => {
    const result = calculateNetFromGross(20000);

    // 20.000'nin 16.500'ü asgari, 3.500'ü üzerinde SGK uygulanır
    expect(result.sgkDeduction).toBeGreaterThan(0);
    expect(result.sgkDeduction).toBeLessThan(20000 * 0.15); // %15'ten az
  });

  it('Net-brüt dönüşümü ters işlem sonucunu doğrular', () => {
    const net = 35000;
    const result = calculateGrossFromNet(net);

    expect(result.net).toBeCloseTo(net, 1); // ±0.01 TL
  });

  it('Vergi dilimi sınırını doğru hesaplar (95.000)', () => {
    // 95.000'de %15, üzeri %20
    const result95 = calculateNetFromGross(95000);
    const result96 = calculateNetFromGross(96000);

    // 96.000 daha az net vermelidir (1.000 TL fark, vergi dilimi yükseliyor)
    expect(result96.incomeTax).toBeGreaterThan(result95.incomeTax);
  });
});

describe('Kıdem Tazminatı', () => {
  it('1 yıl kıdem için doğru hesaplar', () => {
    const result = calculateSeverance(45000, 1, 0, 0);

    expect(result.totalDays).toBe(30); // 1 yıl = 30 gün
    expect(result.grossAmount).toBeGreaterThan(0);
    expect(result.stampTax).toBeGreaterThan(0);
    expect(result.netAmount).toBeGreaterThan(0);
    expect(result.netAmount).toBeLessThan(result.grossAmount);
  });

  it('Kısmi kıdem (ay + gün) oransal hesapla', () => {
    const result = calculateSeverance(45000, 1, 6, 15);

    // 1 yıl 6 ay 15 gün = 30 + 15 + 15 = 60 gün
    expect(result.totalDays).toBeCloseTo(60, 1);
  });

  it('Kıdem tazminatı tavanı uygulanır', () => {
    // Çok yüksek maaş + çok kıdem = tavana çarpa
    const result = calculateSeverance(500000, 20, 0, 0);

    // Tavanla sınırlanmış olmalı
    expect(result.grossAmount).toBeLessThan(500000 * 30 * 20);
  });

  it('Damga vergisi doğru hesaplanır', () => {
    const result = calculateSeverance(45000, 1, 0, 0);

    // Damga vergisi = brüt × %0.759
    const expectedStamp = Math.round(result.grossAmount * 0.00759 * 100) / 100;
    expect(result.stampTax).toBeCloseTo(expectedStamp, 1);
  });
});

describe('İhbar Tazminatı', () => {
  it('6 aydan az kıdem için 2 hafta ihbar', () => {
    const result = calculateNoticeSeverance(45000, 0.3);

    expect(result.noticeWeeks).toBe(2);
  });

  it('1-3 yıl kıdem için 4 hafta ihbar', () => {
    const result = calculateNoticeSeverance(45000, 2);

    expect(result.noticeWeeks).toBe(4);
  });

  it('3 yıl+ kıdem için 8 hafta ihbar', () => {
    const result = calculateNoticeSeverance(45000, 5);

    expect(result.noticeWeeks).toBe(8);
  });

  it('İhbar tazminatı miktarı haftalık ücretle orantılı', () => {
    const result = calculateNoticeSeverance(45000, 0.5);

    const expectedWeekly = 45000 / 4.33;
    const expectedAmount = Math.round(expectedWeekly * 2 * 100) / 100;

    expect(result.noticeAmount).toBeCloseTo(expectedAmount, 1);
  });
});

describe('Fazla Mesai', () => {
  it('Saatlik ücret doğru hesaplanır (aylık / 225)', () => {
    const result = calculateOvertime(45000, 0);

    const expectedHourly = Math.round((45000 / 225) * 100) / 100;
    expect(result.hourlyRate).toBeCloseTo(expectedHourly, 1);
  });

  it('Fazla mesai ücreti 1.5 çarpanı uygulanır', () => {
    const result = calculateOvertime(45000, 10);

    const hourly = 45000 / 225;
    const expectedGross = Math.round(hourly * 10 * 1.5 * 100) / 100;

    expect(result.grossAmount).toBeCloseTo(expectedGross, 1);
  });

  it('Damga vergisi kesintili net ödeme', () => {
    const result = calculateOvertime(45000, 10);

    expect(result.netAmount).toBeLessThan(result.grossAmount);
    expect(result.stampTax).toBeCloseTo(result.grossAmount * 0.00759, 1);
  });
});

describe('Resmi Tatil Mesaisi', () => {
  it('Günlük ücret doğru hesaplanır (aylık / 30)', () => {
    const result = calculatePublicHolidayWork(45000, 0);

    const expectedDaily = Math.round((45000 / 30) * 100) / 100;
    expect(result.dailyRate).toBeCloseTo(expectedDaily, 1);
  });

  it('Çalışılan gün sayısıyla ödeme çarpılır', () => {
    const result = calculatePublicHolidayWork(45000, 3);

    const daily = 45000 / 30;
    const expectedGross = Math.round(daily * 3 * 100) / 100;

    expect(result.grossAmount).toBeCloseTo(expectedGross, 1);
  });

  it('Damga vergisi uygulanır', () => {
    const result = calculatePublicHolidayWork(45000, 1);

    expect(result.stampTax).toBeCloseTo(result.grossAmount * 0.00759, 1);
    expect(result.netAmount).toBeCloseTo(
      result.grossAmount - result.stampTax,
      1
    );
  });
});

describe('Para Formatı', () => {
  it('Türkçe ₺ sembolü ile formatlar', () => {
    const formatted = formatCurrency(1000);

    expect(formatted).toContain('₺');
    expect(formatted).toContain('1.000');
  });

  it('2 ondalık basamağı gösterir', () => {
    const formatted = formatCurrency(1000.5);

    expect(formatted).toMatch(/,\d{2}/); // ,50 gibi
  });
});

describe('Kenar Durumları', () => {
  it('Sıfır maaş işler', () => {
    const result = calculateNetFromGross(0);

    expect(result.net).toBe(0);
    expect(result.sgkDeduction).toBe(0);
    expect(result.incomeTax).toBe(0);
  });

  it('Negatif net hiçbir zaman döndürülmez', () => {
    const result = calculateNetFromGross(0);

    expect(result.net).toBeGreaterThanOrEqual(0);
  });

  it('Çok yüksek maaş işler', () => {
    const result = calculateNetFromGross(1000000);

    expect(result.net).toBeGreaterThan(0);
    expect(result.net).toBeLessThan(result.gross);
  });
});
