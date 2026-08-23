export interface Data {
  precio: number;
  datetime: string;
}

export interface LegacyPriceResponse {
  preciosHoras: Data[];
}

export type DaySelector = 'today' | 'tomorrow';
export type PriceZone = 'peninsular' | 'canarias' | 'baleares' | 'ceuta' | 'melilla';

export interface ResultError {
  code: 'transport' | 'timeout' | 'provider' | 'malformed_payload';
  message: string;
}

export interface PriceInterval {
  startsAt: string;
  instant: string;
  utcOffsetMinutes: number;
  valueEurMWh: number;
}

interface ResultBase {
  selector: DaySelector;
  resolvedDate: string;
  timeZone: 'Europe/Madrid';
  expectedIntervalCount: number;
  receivedIntervalCount: number;
}

export type AvailableResult = ResultBase & {
  state: 'available';
  values: PriceInterval[];
  retryable?: never;
  reason?: never;
  expectedPublicationAt?: never;
  error?: never;
};

export type UnavailableResult = ResultBase & ({
  state: 'unavailable';
  values: [];
  retryable: true;
  reason: 'before_publication';
  expectedPublicationAt: string;
  error?: never;
} | {
  state: 'unavailable';
  values: [];
  retryable: true;
  reason: 'provider_delay';
  expectedPublicationAt?: never;
  error?: never;
});

export type IncompleteResult = ResultBase & {
  state: 'incomplete';
  values: PriceInterval[];
  reason: 'coverage_mismatch';
  retryable?: never;
  expectedPublicationAt?: never;
  error?: never;
};

export type EmptyResult = ResultBase & {
  state: 'empty';
  values: [];
  receivedIntervalCount: 0;
  retryable?: never;
  reason?: never;
  expectedPublicationAt?: never;
  error?: never;
};

export type FailureResult = ResultBase & {
  state: 'failure';
  values: [];
  retryable: boolean;
  error: ResultError;
  reason?: never;
  expectedPublicationAt?: never;
};

export type DayPriceResult =
  | AvailableResult
  | UnavailableResult
  | IncompleteResult
  | EmptyResult
  | FailureResult;

// Modelo para histórico diario usado por /api/historico
export interface PrecioDiario {
  fecha: string; // YYYY-MM-DD
  media: number | null;
  minimo: number | null;
  maximo: number | null;
}

export interface HistoricoResponse {
  range: 'semana' | 'mes' | 'anio';
  values: PrecioDiario[];
}
