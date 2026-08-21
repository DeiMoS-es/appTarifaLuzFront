import { PriceInterval } from '../../../interfaces/data';
import { buildPriceChartPoints, canonicalInstantKey } from './price-chart';

describe('price chart helpers', () => {
  const interval = (
    startsAt: string,
    instant: string,
    utcOffsetMinutes: number,
    valueEurMWh: number
  ): PriceInterval => ({ startsAt, instant, utcOffsetMinutes, valueEurMWh });

  it('uses the canonical instant as the chart identity', () => {
    const summerHour = interval(
      '2026-10-25T02:00:00+02:00',
      '2026-10-25T00:00:00Z',
      120,
      81.25
    );
    const winterHour = interval(
      '2026-10-25T02:00:00+01:00',
      '2026-10-25T01:00:00Z',
      60,
      79.4
    );

    expect(canonicalInstantKey(summerHour)).toBe('2026-10-25T00:00:00Z');
    expect(canonicalInstantKey(winterHour)).toBe('2026-10-25T01:00:00Z');
  });

  it('uses plain Madrid hour labels when local hours are unique', () => {
    const points = buildPriceChartPoints([
      interval('2026-08-21T00:00:00+02:00', '2026-08-20T22:00:00Z', 120, 92.41),
      interval('2026-08-21T01:00:00+02:00', '2026-08-20T23:00:00Z', 120, 87.16)
    ]);

    expect(points.map(point => point.label)).toEqual(['00:00', '01:00']);
    expect(points.map(point => point.valueEurMWh)).toEqual([92.41, 87.16]);
  });

  it('orders repeated Madrid hours by instant and labels both offsets', () => {
    const points = buildPriceChartPoints([
      interval('2026-10-25T03:00:00+01:00', '2026-10-25T02:00:00Z', 60, 75.3),
      interval('2026-10-25T02:00:00+01:00', '2026-10-25T01:00:00Z', 60, 79.4),
      interval('2026-10-25T02:00:00+02:00', '2026-10-25T00:00:00Z', 120, 81.25)
    ]);

    expect(points.map(point => point.key)).toEqual([
      '2026-10-25T00:00:00Z',
      '2026-10-25T01:00:00Z',
      '2026-10-25T02:00:00Z'
    ]);
    expect(points.map(point => point.label)).toEqual([
      '02:00 (UTC+02:00)',
      '02:00 (UTC+01:00)',
      '03:00'
    ]);
  });
});
