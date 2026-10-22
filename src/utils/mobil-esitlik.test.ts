/**
 * WEB = MOBİL denkliği.
 *
 * Web ve mobil AYRI kod tabanlarıdır; aynı hesap iki kez yazılıyor. Bu test
 * ikisinin aynı girdi için aynı sonucu verdiğini sabitler. Aynı senaryonun
 * aynası mobil tarafta da vardır:
 *   Mesai-Defterim/src/services/calc.test.ts → "web = mobil" bloğu
 *
 * Biri değişip diğeri değişmezse bu test kırılır ve sessiz ayrışma önlenir.
 */
import { describe, expect, it } from 'vitest';
import {
  calculateExtraPayNet,
  calculateGrossFromNet,
  calculateNetFromGross,
  calculateNoticeSeverance,
  calculateOvertime,
  calculatePublicHolidayWork,
  calculateSeverance,
} from './calc-web';

/** Referans senaryo: net 30.000 ₺ */
const NET = 30000;
const BRUT = 35721.94;

describe('web = mobil — net 30.000 ₺ senaryosu', () => {
  it('net → brüt çevrimi', () => {
    expect(calculateGrossFromNet(NET).gross).toBe(BRUT);
  });

  it('saatlik brüt ücret = brüt / 225', () => {
    expect(calculateOvertime(BRUT, 10).hourlyRate).toBe(158.76);
  });

  it('10 saat fazla mesai (×1,5) brüt tutarı', () => {
    expect(calculateOvertime(BRUT, 10).grossAmount).toBe(2381.46);
  });

  it('1 gün resmi tatil ilavesi = brüt / 30', () => {
    expect(calculatePublicHolidayWork(BRUT, 1).grossAmount).toBe(1190.73);
  });

  // Mobil "yaklaşık net" satırı: bruttenNete(maaş + ilave). Web yalnız ilaveyi
  // gösterdiği için aynı modelle bruttenNete(maaş + ilave) − bruttenNete(maaş).
  // Mobil değerleri: bruttenNete(BRUT) = 29.999,99; +FM = 31.702,52; +UBGT = 30.851,26
  it('fazla mesai ilavesinin yaklaşık neti (tam kesintilerle)', () => {
    expect(calculateExtraPayNet(BRUT, 2381.46)).toBe(1702.53);
  });

  it('resmi tatil ilavesinin yaklaşık neti (tam kesintilerle)', () => {
    expect(calculateExtraPayNet(BRUT, 1190.73)).toBe(851.27);
  });
});

/** Mobil ihbarTazminati(…, 45.000) çıktıları — mobil kodla üretildi. */
describe('web = mobil — ihbar tazminatı, brüt 45.000 ₺', () => {
  const vakalar: [string, number, number, number, number][] = [
    // [açıklama, kıdem yılı, hafta, brüt, net]
    ['110 gün (< 6 ay)', 0.3, 2, 21000, 17690.61],
    ['184 gün (6 ay - 1,5 yıl)', 0.51, 4, 42000, 35381.22],
    ['1 yıl', 1, 4, 42000, 35381.22],
    ['2 yıl (1,5 - 3 yıl)', 2, 6, 63000, 53071.83],
    ['5 yıl (3 yıl+)', 5, 8, 84000, 70762.44],
  ];
  for (const [ad, yil, hafta, brut, net] of vakalar) {
    it(ad, () => {
      const r = calculateNoticeSeverance(45000, yil);
      expect(r.noticeWeeks).toBe(hafta);
      expect(r.noticeAmount).toBe(brut);
      expect(r.netAmount).toBe(net);
    });
  }
});

/** Mobil bruttenNete referansları. */
describe('web = mobil — brütten nete', () => {
  it('asgari ücret 33.030 → 28.075,50', () => {
    expect(calculateNetFromGross(33030).net).toBe(28075.5);
  });
  it('45.000 → 36.632,97', () => {
    expect(calculateNetFromGross(45000).net).toBe(36632.97);
  });
});

/**
 * Mobil kidemTazminati(giriş, çıkış, maaş) çıktıları — mobil kodla üretildi.
 * İki dönem tavanı, tavan altı/üstü, 1 yıl sınırı ve artık yıllı süreler.
 */
describe('web = mobil — kıdem tazminatı', () => {
  const vakalar: [string, string, number, number, number, number, number][] = [
    // [giriş, çıkış, maaş, gün, tavan, brüt, net]
    ['2021-07-15', '2026-07-15', 30000, 1826, 73729.84, 150082.19, 148943.07],
    ['2021-01-01', '2026-03-01', 50000, 1885, 64948.77, 258219.18, 256259.29],
    ['2016-03-10', '2026-09-20', 100000, 3846, 73729.84, 776890.31, 770993.72],
    ['2022-05-01', '2026-05-01', 100000, 1461, 64948.77, 259973.02, 257999.83],
    ['2025-11-01', '2026-10-31', 40000, 364, 73729.84, 0, 0],
    ['2025-10-31', '2026-10-31', 40000, 365, 73729.84, 40000, 39696.4],
    ['2023-02-14', '2026-08-27', 45678.9, 1290, 73729.84, 161440.5, 160215.16],
  ];
  for (const [giris, cikis, maas, gun, tavan, brut, net] of vakalar) {
    it(`${giris} → ${cikis}, ${maas} ₺`, () => {
      const r = calculateSeverance(giris, cikis, maas);
      expect([r.totalDays, r.ceiling, r.grossAmount, r.netAmount]).toEqual([gun, tavan, brut, net]);
    });
  }
});
