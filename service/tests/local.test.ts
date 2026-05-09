import { describe, expect, test } from '@jest/globals';
import { getCurrentMarketPrice } from '../src/shared/utils/getMarketPrice';
import { preciseRound } from '../src/shared/utils/mathHelper';

describe.skip('Get Current Market Price', () => {
  test('returns the market price of a stock/etf', async () => {
    const price = await getCurrentMarketPrice('GOOG');
    expect(price).toBeTruthy();
    expect(price).toBeGreaterThan(0);
  });

  test('cannot get the market price of an option', async () => {
    const price = await getCurrentMarketPrice('SPY260507P00700000');
    expect(price).toBeTruthy();
    expect(price).toBeGreaterThan(0);
  });

});

describe('Rounding Helper', () => {
  test('preciseRound(1.005, 2) returns 1.01', () => {
    expect(preciseRound(1.005, 2)).toBe(1.01);
  });

  test('preciseRound(499.99999999975, 2) returns 500', () => {
    expect(preciseRound(499.99999999975, 2)).toBe(500);
  });

  test('preciseRound(1.005, 3) returns 1.005', () => {
    expect(preciseRound(1.005, 3)).toBe(1.005);
  });
});