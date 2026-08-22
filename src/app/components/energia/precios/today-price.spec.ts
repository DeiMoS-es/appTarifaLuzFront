import { AvailableResult, PriceInterval } from '../../../interfaces/data';
import { buildTodayPriceViewModel, classifyPriceBand } from './today-price';

describe('Today price presentation helpers', () => {
  const interval = (hour: number, valueEurMWh: number): PriceInterval => ({
    startsAt: `2026-08-21T${hour.toString().padStart(2, '0')}:00:00+02:00`,
    instant: new Date(Date.parse('2026-08-20T22:00:00Z') + hour * 3_600_000).toISOString(),
    utcOffsetMinutes: 120,
    valueEurMWh
  });
  const result = (values: PriceInterval[]): AvailableResult => ({
    selector: 'today', resolvedDate: '2026-08-21', timeZone: 'Europe/Madrid',
    expectedIntervalCount: values.length, receivedIntervalCount: values.length,
    state: 'available', values
  });

  it('classifies an ordinary distribution with deterministic tertile quantiles', () => {
    const prices = [10, 20, 30, 40, 50, 60];

    expect(prices.map(price => classifyPriceBand(price, prices)))
      .toEqual(['low', 'low', 'medium', 'medium', 'high', 'high']);
  });

  it('classifies distinct repeated price groups as low and high', () => {
    const prices = [10, 10, 10, 20, 20, 20];

    expect(prices.map(price => classifyPriceBand(price, prices)))
      .toEqual(['low', 'low', 'low', 'high', 'high', 'high']);
  });

  it('handles equal, sparse, non-finite, zero, and negative values deterministically', () => {
    expect([5, 5, 5].map(price => classifyPriceBand(price, [5, 5, 5])))
      .toEqual(['medium', 'medium', 'medium']);
    expect([-10, 0].map(price => classifyPriceBand(price, [-10, 0])))
      .toEqual(['low', 'high']);
    expect(classifyPriceBand(7, [7])).toBe('medium');
    expect(classifyPriceBand(Number.NaN, [0, 10, Number.NaN])).toBe('medium');
  });

  it('selects the current interval and builds low-category copy and summaries', () => {
    const view = buildTodayPriceViewModel(
      result([interval(0, 60), interval(1, 20), interval(2, 40)]),
      Date.parse('2026-08-20T23:30:00Z')
    );

    expect(view.currentPrice).toBe('0,020');
    expect(view.badge).toBe('Precio valle hasta las 02:00');
    expect(view.recommendation.title).toBe('Buen momento para consumir');
    expect(view.summary).toEqual({
      minimum: '0,020', minimumTime: '01:00–02:00', maximum: '0,060',
      maximumTime: '00:00–01:00', average: '0,040'
    });
    expect(view.points.map(point => [point.label, point.band]))
      .toEqual([['00:00', 'high'], ['01:00', 'low'], ['02:00', 'medium']]);
  });

  it('provides explicit medium and high recommendation variants', () => {
    const values = [interval(0, 10), interval(1, 20), interval(2, 30)];

    const medium = buildTodayPriceViewModel(result(values), Date.parse('2026-08-20T23:30:00Z'));
    const high = buildTodayPriceViewModel(result(values), Date.parse('2026-08-21T00:30:00Z'));

    expect(medium.badge).toBe('Precio medio hasta las 02:00');
    expect(medium.recommendation.title).toBe('Consumo moderado');
    expect(high.badge).toBe('Precio punta hasta las 03:00');
    expect(high.recommendation.title).toBe('Reduce el consumo si puedes');
  });

  it('reports the absence of a current interval without inventing a price', () => {
    const view = buildTodayPriceViewModel(result([interval(0, 10)]), Date.parse('2026-08-21T12:00:00Z'));

    expect(view.currentPrice).toBeNull();
    expect(view.badge).toBe('Sin intervalo vigente');
    expect(view.recommendation.title).toBe('Sin recomendación horaria');
  });
});
