import { AvailableResult, PriceInterval } from '../../../interfaces/data';
import { averageVariationPercent, buildTomorrowPriceViewModel } from './tomorrow-price';

describe('Tomorrow price presentation helpers', () => {
  const interval = (index: number, price: number, localHour = index): PriceInterval => ({
    startsAt: `2026-10-25T${(localHour % 24).toString().padStart(2, '0')}:00:00+01:00`,
    instant: new Date(Date.parse('2026-10-24T23:00:00Z') + index * 3_600_000).toISOString(),
    utcOffsetMinutes: 60, valueEurMWh: price
  });
  const result = (selector: 'today' | 'tomorrow', prices: number[]): AvailableResult => ({
    selector, resolvedDate: selector === 'today' ? '2026-10-24' : '2026-10-25',
    timeZone: 'Europe/Madrid', expectedIntervalCount: prices.length,
    receivedIntervalCount: prices.length, state: 'available',
    values: prices.map((price, index) => interval(index, price))
  });

  it('calculates signed average variation and refuses a zero baseline', () => {
    expect(averageVariationPercent([120], [100])).toBe(20);
    expect(averageVariationPercent([80], [100])).toBe(-20);
    expect(averageVariationPercent([0], [0])).toBeNull();
    expect(averageVariationPercent([10], undefined)).toBeNull();
  });

  it('builds average, minimum range, and comparison without inventing precision', () => {
    const view = buildTomorrowPriceViewModel(result('tomorrow', [60, 20, 40]), result('today', [50, 50]));

    expect(view.forecast).toEqual({
      average: '0,040', variation: '↓ -20% vs hoy',
      minimum: '0,020', minimumTime: '01:00–02:00'
    });
    expect(view.points).toHaveSize(3);
  });

  it('selects three distinct cheapest intervals by price then canonical instant', () => {
    const tomorrow = result('tomorrow', [50, 20, 20, 10, 10]);
    tomorrow.values.push({ ...tomorrow.values[3] });
    const best = buildTomorrowPriceViewModel(tomorrow).bestHours;

    expect(best.map(item => [item.range, item.price])).toEqual([
      ['03:00–04:00', '0,010'], ['04:00–05:00', '0,010'], ['01:00–02:00', '0,020']
    ]);
    expect(best.map(item => item.copy)).toEqual(['La hora más barata', 'Ideal para cocinar', 'Buen momento']);
  });

  it('keeps 23 and 25 canonical intervals, finite meters, and sparse ticks', () => {
    for (const count of [23, 24, 25]) {
      const prices = Array.from({ length: count }, (_, index) => index === 0 ? -10 : index === 1 ? 0 : 10);
      const view = buildTomorrowPriceViewModel(result('tomorrow', prices));
      expect(view.points).toHaveSize(count);
      expect(view.points.every(point => Number.isFinite(point.height))).toBeTrue();
      expect(view.points.filter(point => point.axisLabel !== null).length).toBeLessThanOrEqual(5);
      expect(view.forecast.variation).toBeNull();
    }

    const equal = buildTomorrowPriceViewModel(result('tomorrow', [0, 0, 0]));
    expect(equal.points.map(point => point.band)).toEqual(['medium', 'medium', 'medium']);
    expect(equal.points.every(point => Number.isFinite(point.height))).toBeTrue();
  });
});
