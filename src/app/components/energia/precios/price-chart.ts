import { PriceInterval } from '../../../interfaces/data';

export interface PriceChartPoint {
  readonly key: string;
  readonly label: string;
  readonly valueEurMWh: number;
}

export function canonicalInstantKey(interval: PriceInterval): string {
  return interval.instant;
}

export function buildPriceChartPoints(
  intervals: readonly PriceInterval[]
): PriceChartPoint[] {
  const localHours = intervals.map(localHour);
  const hourCounts = new Map<string, number>();

  localHours.forEach(hour => hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1));

  return intervals
    .map((interval, index) => ({
      key: canonicalInstantKey(interval),
      label: hourCounts.get(localHours[index]) === 1
        ? localHours[index]
        : `${localHours[index]} (${formatUtcOffset(interval.utcOffsetMinutes)})`,
      valueEurMWh: interval.valueEurMWh
    }))
    .sort((left, right) => Date.parse(left.key) - Date.parse(right.key));
}

function localHour(interval: PriceInterval): string {
  return interval.startsAt.slice(11, 16);
}

function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, '0');
  const minutes = (absoluteMinutes % 60).toString().padStart(2, '0');

  return `UTC${sign}${hours}:${minutes}`;
}
