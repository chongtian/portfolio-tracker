import { describe, expect, test } from '@jest/globals';
import { getCurrentMarketPrice } from '../src/shared/utils/getMarketPrice';

describe('Get Current Market Price', () => {
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