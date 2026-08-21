import { Observable, Subject } from 'rxjs';
import {
  AvailableResult,
  DayPriceResult,
  DaySelector,
  EmptyResult,
  FailureResult,
  IncompleteResult,
  UnavailableResult
} from 'src/app/interfaces/data';
import { PreciosService } from 'src/app/services/precios.service';
import { PreciosComponent } from './precios.component';
describe('PreciosComponent', () => {
  let component: PreciosComponent;
  let getPrecios: jasmine.Spy;
  let requests: Record<DaySelector, Subject<DayPriceResult>[]>;
  const availableToday: AvailableResult = {
    selector: 'today',
    resolvedDate: '2026-08-21',
    timeZone: 'Europe/Madrid',
    expectedIntervalCount: 24,
    receivedIntervalCount: 24,
    state: 'available',
    values: [{
      startsAt: '2026-08-21T00:00:00+02:00',
      instant: '2026-08-20T22:00:00Z',
      utcOffsetMinutes: 120,
      valueEurMWh: 92.41
    }]
  };
  const unavailableTomorrow: UnavailableResult = {
    selector: 'tomorrow',
    resolvedDate: '2026-08-22',
    timeZone: 'Europe/Madrid',
    expectedIntervalCount: 24,
    receivedIntervalCount: 0,
    state: 'unavailable',
    values: [],
    retryable: true,
    reason: 'before_publication',
    expectedPublicationAt: '2026-08-21T20:15:00+02:00'
  };

  beforeEach(() => {
    requests = { today: [], tomorrow: [] };
    getPrecios = jasmine.createSpy('getPrecios').and.callFake(
      (selector: DaySelector): Observable<DayPriceResult> => {
        const request = new Subject<DayPriceResult>();
        requests[selector].push(request);
        return request.asObservable();
      }
    );
    component = new PreciosComponent({ getPrecios } as unknown as PreciosService);
  });

  it('requests today and tomorrow independently and stores both results', () => {
    component.ngOnInit();

    expect(getPrecios.calls.allArgs()).toEqual([['today'], ['tomorrow']]);
    expect(component.todayDay).toEqual({
      selector: 'today',
      state: 'loading',
      result: null
    });
    expect(component.tomorrowDay).toEqual({
      selector: 'tomorrow',
      state: 'loading',
      result: null
    });

    requests.today[0].next(availableToday);
    requests.tomorrow[0].next(unavailableTomorrow);

    expect(component.todayDay).toEqual({
      selector: 'today',
      state: 'available',
      result: availableToday
    });
    expect(component.tomorrowDay).toEqual({
      selector: 'tomorrow',
      state: 'unavailable',
      result: unavailableTomorrow
    });
  });

  it('stores every day result variant as an exhaustive controller state', () => {
    const incomplete: IncompleteResult = {
      selector: 'today',
      resolvedDate: '2026-08-21',
      timeZone: 'Europe/Madrid',
      expectedIntervalCount: 24,
      receivedIntervalCount: 23,
      state: 'incomplete',
      values: availableToday.values,
      reason: 'coverage_mismatch'
    };
    const empty: EmptyResult = {
      selector: 'today',
      resolvedDate: '2026-08-21',
      timeZone: 'Europe/Madrid',
      expectedIntervalCount: 24,
      receivedIntervalCount: 0,
      state: 'empty',
      values: []
    };
    const failure: FailureResult = {
      selector: 'today',
      resolvedDate: '2026-08-21',
      timeZone: 'Europe/Madrid',
      expectedIntervalCount: 24,
      receivedIntervalCount: 0,
      state: 'failure',
      values: [],
      retryable: true,
      error: { code: 'provider', message: 'Provider unavailable' }
    };
    const results: DayPriceResult[] = [
      availableToday,
      { ...unavailableTomorrow, selector: 'today' },
      incomplete,
      empty,
      failure
    ];
    component.ngOnInit();

    for (const result of results) {
      requests.today[0].next(result);
      expect(component.todayDay.selector).toBe('today');
      expect(component.todayDay.state).toBe(result.state);
      expect(component.todayDay.result).toBe(result);
    }
  });

  it('retries only the target selector and preserves the other day result', () => {
    const refreshedTomorrow: AvailableResult = {
      ...availableToday,
      selector: 'tomorrow',
      resolvedDate: '2026-08-22'
    };
    component.ngOnInit();
    requests.today[0].next(availableToday);
    requests.tomorrow[0].next(unavailableTomorrow);
    const preservedToday = component.todayDay;

    component.retry('tomorrow');

    expect(getPrecios.calls.allArgs()).toEqual([
      ['today'],
      ['tomorrow'],
      ['tomorrow']
    ]);
    expect(component.todayDay).toBe(preservedToday);
    expect(component.tomorrowDay).toEqual({
      selector: 'tomorrow',
      state: 'loading',
      result: null
    });

    requests.tomorrow[1].next(refreshedTomorrow);

    expect(component.todayDay).toBe(preservedToday);
    expect(component.tomorrowDay).toEqual({
      selector: 'tomorrow',
      state: 'available',
      result: refreshedTomorrow
    });
  });

  it('stores a typed failure returned through the HTTP error channel', () => {
    const failure: FailureResult = {
      selector: 'today',
      resolvedDate: '2026-08-21',
      timeZone: 'Europe/Madrid',
      expectedIntervalCount: 24,
      receivedIntervalCount: 0,
      state: 'failure',
      values: [],
      retryable: true,
      error: { code: 'transport', message: 'Upstream request timed out' }
    };
    component.ngOnInit();

    requests.today[0].error({ error: failure });

    expect(component.todayDay).toEqual({
      selector: 'today',
      state: 'failure',
      result: failure
    });
    expect(component.tomorrowDay).toEqual({
      selector: 'tomorrow',
      state: 'loading',
      result: null
    });
  });

  it('keeps the legacy today presentation populated before the two-day template lands', () => {
    const createChart = spyOn<any>(component, 'crearGrafico').and.callFake(() => {
      component.precioMedio = 0.092;
      component.precioMaximo = 0.092;
      component.precioMinimo = 0.092;
    });
    component.ngOnInit();
    requests.today[0].next(availableToday);
    expect(component.precioZona.preciosHoras).toEqual([
      { precio: 92.41, datetime: '2026-08-21T00:00:00+02:00' }
    ]);
    expect(createChart).toHaveBeenCalledTimes(1);
    expect(component.cardDataArray.map(card => card.price)).toEqual([
      '0.092 €/kWh', '0.092 €/kWh', '0.092 €/kWh'
    ]);
  });

  it('accepts only the latest selector request and stops updates after destruction', () => {
    component.ngOnInit();
    component.retry('today');

    requests.today[0].next({ ...unavailableTomorrow, selector: 'today' });
    expect(component.todayDay.state).toBe('loading');

    requests.today[1].next(availableToday);
    expect(component.todayDay.result).toBe(availableToday);

    component.ngOnDestroy();
    requests.tomorrow[0].next({ ...availableToday, selector: 'tomorrow' });
    expect(component.tomorrowDay.state).toBe('loading');
  });

  it('maps unrecognized request errors to a safe failure and preserves the other day', () => {
    component.ngOnInit();
    requests.tomorrow[0].next(unavailableTomorrow);

    requests.today[0].error({ status: 0, message: 'private proxy details' });

    expect(component.todayDay).toEqual({
      selector: 'today',
      state: 'failure',
      result: {
        selector: 'today',
        resolvedDate: '',
        timeZone: 'Europe/Madrid',
        expectedIntervalCount: 0,
        receivedIntervalCount: 0,
        state: 'failure',
        values: [],
        retryable: true,
        error: { code: 'transport', message: 'Unable to load electricity prices.' }
      }
    });
    expect(component.tomorrowDay.result).toBe(unavailableTomorrow);
  });

});
