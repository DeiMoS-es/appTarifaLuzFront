import { AvailableResult } from '../../../interfaces/data';
import { buildPriceChartPoints } from './price-chart';

export type PriceBand = 'low' | 'medium' | 'high';

export interface TodayChartPoint {
  readonly key: string;
  readonly label: string;
  readonly valueEurMWh: number;
  readonly formattedPrice: string;
  readonly band: PriceBand;
  readonly bandLabel: string;
  readonly height: number;
  readonly meterMinimum: number;
  readonly meterMaximum: number;
  readonly isCurrent: boolean;
  readonly axisLabel: string | null;
}

export interface TodayPriceViewModel {
  readonly currentPrice: string | null;
  readonly badge: string;
  readonly recommendation: { readonly title: string; readonly copy: string };
  readonly points: readonly TodayChartPoint[];
  readonly summary: {
    readonly minimum: string;
    readonly minimumTime: string;
    readonly maximum: string;
    readonly maximumTime: string;
    readonly average: string;
  };
}

const recommendationByBand: Record<PriceBand, TodayPriceViewModel['recommendation']> = {
  low: {
    title: 'Buen momento para consumir',
    copy: 'Aprovecha este tramo para usar los electrodomésticos que más consumen.'
  },
  medium: {
    title: 'Consumo moderado',
    copy: 'El precio está en un nivel intermedio; prioriza solo lo que necesites.'
  },
  high: {
    title: 'Reduce el consumo si puedes',
    copy: 'Pospone los consumos intensivos hasta un tramo más económico.'
  }
};

export function classifyPriceBand(value: number, dayPrices: readonly number[]): PriceBand {
  const sorted = Array.from(new Set(dayPrices.filter(Number.isFinite))).sort((left, right) => left - right);
  if (!Number.isFinite(value) || sorted.length < 2 || sorted[0] === sorted[sorted.length - 1]) {
    return 'medium';
  }

  const lower = quantile(sorted, 1 / 3);
  const upper = quantile(sorted, 2 / 3);
  if (value < lower) return 'low';
  if (value > upper) return 'high';
  return 'medium';
}

export function buildTodayPriceViewModel(
  result: AvailableResult,
  nowMs: number = Date.now()
): TodayPriceViewModel {
  const chartPoints = buildPriceChartPoints(result.values);
  const finitePrices = chartPoints.map(point => point.valueEurMWh).filter(Number.isFinite);
  const minimum = Math.min(...finitePrices);
  const maximum = Math.max(...finitePrices);
  const meterMinimum = minimum === maximum ? Math.min(0, minimum) : minimum;
  const meterMaximum = minimum === maximum ? (maximum === 0 ? 1 : Math.max(0, maximum)) : maximum;
  const currentIndex = chartPoints.findIndex(point => {
    const start = Date.parse(point.key);
    return Number.isFinite(start) && start <= nowMs && nowMs < start + 3_600_000;
  });

  const points = chartPoints.map((point, index): TodayChartPoint => {
    const band = classifyPriceBand(point.valueEurMWh, finitePrices);
    return {
      ...point, band, bandLabel: bandLabel(band), formattedPrice: formatPrice(point.valueEurMWh),
      height: Number.isFinite(point.valueEurMWh)
        ? (point.valueEurMWh - meterMinimum) / (meterMaximum - meterMinimum) * 100 : 0,
      meterMinimum, meterMaximum, isCurrent: index === currentIndex,
      axisLabel: axisLabel(point.label)
    };
  });
  const current = currentIndex < 0 ? null : points[currentIndex];
  const currentBand = current?.band;
  const minimumPoint = points.find(point => point.valueEurMWh === minimum)!;
  const maximumPoint = points.find(point => point.valueEurMWh === maximum)!;
  const minimumIndex = points.indexOf(minimumPoint);
  const maximumIndex = points.indexOf(maximumPoint);

  return {
    currentPrice: current?.formattedPrice ?? null,
    badge: current && currentBand
      ? `Precio ${bandLabel(currentBand)} hasta las ${intervalEndLabel(points, currentIndex)}`
      : 'Sin intervalo vigente',
    recommendation: currentBand ? recommendationByBand[currentBand] : {
      title: 'Sin recomendación horaria',
      copy: 'No hay un intervalo vigente para ofrecer una recomendación fiable.'
    },
    points,
    summary: {
      minimum: formatPrice(minimum), minimumTime: timeRangeLabel(points, minimumIndex),
      maximum: formatPrice(maximum), maximumTime: timeRangeLabel(points, maximumIndex),
      average: formatPrice(finitePrices.reduce((sum, price) => sum + price, 0) / finitePrices.length)
    }
  };
}

function quantile(sorted: readonly number[], position: number): number {
  const index = (sorted.length - 1) * position;
  const lowerIndex = Math.floor(index);
  const fraction = index - lowerIndex;
  return sorted[lowerIndex] + ((sorted[lowerIndex + 1] ?? sorted[lowerIndex]) - sorted[lowerIndex]) * fraction;
}

function bandLabel(band: PriceBand): string {
  return band === 'low' ? 'valle' : band === 'high' ? 'punta' : 'medio';
}

function axisLabel(label: string): string | null {
  const hour = Number(label.slice(0, 2));
  return [0, 6, 12, 18].includes(hour) ? `${hour}h` : null;
}

function intervalEndLabel(points: readonly TodayChartPoint[], index: number): string {
  if (points[index + 1]) return points[index + 1].label;
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid'
  }).format(Date.parse(points[index].key) + 3_600_000);
}

function timeRangeLabel(points: readonly TodayChartPoint[], index: number): string {
  return `${points[index].label}–${intervalEndLabel(points, index)}`;
}

function formatPrice(valueEurMWh: number): string {
  return (valueEurMWh / 1000).toLocaleString('es-ES', {
    minimumFractionDigits: 3, maximumFractionDigits: 3
  });
}
