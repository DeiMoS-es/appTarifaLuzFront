import { AvailableResult } from '../../../interfaces/data';
import { buildPriceChartPoints, PriceChartPoint } from './price-chart';
import { classifyPriceBand, PriceBand } from './today-price';

export interface TomorrowPriceViewModel {
  readonly forecast: {
    readonly average: string;
    readonly variation: string | null;
    readonly minimum: string;
    readonly minimumTime: string;
  };
  readonly points: readonly (PriceChartPoint & {
    readonly formattedPrice: string;
    readonly band: PriceBand;
    readonly bandLabel: string;
    readonly height: number;
    readonly meterMinimum: number;
    readonly meterMaximum: number;
    readonly axisLabel: string | null;
  })[];
  readonly bestHours: readonly {
    readonly key: string;
    readonly range: string;
    readonly price: string;
    readonly band: PriceBand;
    readonly bandLabel: string;
    readonly copy: string;
  }[];
}

export function averageVariationPercent(
  tomorrowPrices: readonly number[],
  todayPrices?: readonly number[]
): number | null {
  const tomorrowAverage = average(tomorrowPrices);
  const todayAverage = todayPrices ? average(todayPrices) : null;
  if (tomorrowAverage === null || todayAverage === null || todayAverage === 0) return null;
  return Math.round((tomorrowAverage - todayAverage) / Math.abs(todayAverage) * 100);
}

export function buildTomorrowPriceViewModel(
  result: AvailableResult,
  todayResult?: AvailableResult | null
): TomorrowPriceViewModel {
  const intervals = Array.from(new Map(result.values.map(interval => [interval.instant, interval])).values());
  const chartPoints = buildPriceChartPoints(intervals);
  const prices = chartPoints.map(point => point.valueEurMWh).filter(Number.isFinite);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const meterMinimum = minimum === maximum ? Math.min(0, minimum) : minimum;
  const meterMaximum = minimum === maximum ? (maximum === 0 ? 1 : Math.max(0, maximum)) : maximum;
  const tickIndexes = sparseTickIndexes(chartPoints.length);
  const points = chartPoints.map((point, index) => {
    const band = classifyPriceBand(point.valueEurMWh, prices);
    return {
      ...point, band, bandLabel: bandName(band), formattedPrice: formatPrice(point.valueEurMWh),
      height: (point.valueEurMWh - meterMinimum) / (meterMaximum - meterMinimum) * 100,
      meterMinimum, meterMaximum,
      axisLabel: tickIndexes.has(index) ? `${point.label.slice(0, 2)}h` : null
    };
  });
  const minimumIndex = points.findIndex(point => point.valueEurMWh === minimum);
  const variation = averageVariationPercent(prices, todayResult?.values.map(value => value.valueEurMWh));
  const bestHours = [...points]
    .sort((left, right) => left.valueEurMWh - right.valueEurMWh || Date.parse(left.key) - Date.parse(right.key))
    .slice(0, 3)
    .map((point, rank) => ({
      key: point.key, range: rangeLabel(points, points.findIndex(candidate => candidate.key === point.key)),
      price: point.formattedPrice, band: point.band, bandLabel: point.bandLabel,
      copy: ['La hora más barata', 'Ideal para cocinar', 'Buen momento'][rank]
    }));

  return {
    forecast: {
      average: formatPrice(average(prices) ?? 0), variation: variationLabel(variation),
      minimum: formatPrice(minimum), minimumTime: rangeLabel(points, minimumIndex)
    },
    points,
    bestHours
  };
}

function average(values: readonly number[]): number | null {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function variationLabel(variation: number | null): string | null {
  if (variation === null) return null;
  return `${variation > 0 ? '↑ +' : variation < 0 ? '↓ ' : '→ '}${variation}% vs hoy`;
}

function rangeLabel(points: readonly PriceChartPoint[], index: number): string {
  const end = points[index + 1]?.label ?? new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid'
  }).format(Date.parse(points[index].key) + 3_600_000);
  return `${points[index].label}–${end}`;
}

function sparseTickIndexes(count: number): Set<number> {
  if (count < 2) return new Set([0]);
  return new Set([0, 1, 2, 3, 4].map(part => Math.round(part * (count - 1) / 4)));
}

function bandName(band: PriceBand): string {
  return band === 'low' ? 'valle' : band === 'high' ? 'punta' : 'medio';
}

function formatPrice(valueEurMWh: number): string {
  return (valueEurMWh / 1000).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
