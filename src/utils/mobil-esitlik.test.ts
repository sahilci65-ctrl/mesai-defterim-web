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
import { calculateGrossFromNet, calculateOvertime, calculatePublicHolidayWork } from './calc-web';

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
});
