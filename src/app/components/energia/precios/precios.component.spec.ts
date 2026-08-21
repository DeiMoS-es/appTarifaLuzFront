import { Observable, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
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

  describe('two-day presentation', () => {
    let fixture: ComponentFixture<PreciosComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CommonModule],
        declarations: [PreciosComponent],
        providers: [{ provide: PreciosService, useValue: { getPrecios } }],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      fixture = TestBed.createComponent(PreciosComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('[role="status"]').length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('Cargando precios');
    });

    it('presents each day independently and retries only an unavailable day', () => {
      requests.today[0].next(availableToday);
      requests.tomorrow[0].next(unavailableTomorrow);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Hoy');
      expect(fixture.nativeElement.textContent).toContain('Mañana');
      expect(fixture.nativeElement.textContent).toContain('Se espera su publicación a las 20:15');

      const retry = fixture.nativeElement.querySelector('[data-day="tomorrow"] button');
      retry.click();

      expect(getPrecios.calls.allArgs()).toEqual([['today'], ['tomorrow'], ['tomorrow']]);
      expect(component.todayDay.result).toBe(availableToday);
    });

    it('distinguishes provider delay, empty, and failure messages', () => {
      requests.today[0].next({
        ...unavailableTomorrow,
        selector: 'today',
        reason: 'provider_delay',
        expectedPublicationAt: undefined
      });
      requests.tomorrow[0].next({
        selector: 'tomorrow', resolvedDate: '2026-08-22', timeZone: 'Europe/Madrid',
        expectedIntervalCount: 24, receivedIntervalCount: 0, state: 'empty', values: []
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('El proveedor todavía no ha publicado los precios');
      expect(fixture.nativeElement.textContent).toContain('No hay precios disponibles para este día');
      fixture.nativeElement.querySelector('[data-day="today"] button').click();
      expect(getPrecios.calls.mostRecent().args).toEqual(['today']);

      requests.tomorrow[0].next({
        selector: 'tomorrow', resolvedDate: '2026-08-22', timeZone: 'Europe/Madrid',
        expectedIntervalCount: 24, receivedIntervalCount: 0, state: 'failure', values: [],
        retryable: true, error: { code: 'provider', message: 'Provider unavailable' }
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los precios');
      expect(fixture.nativeElement.querySelector('[data-derived]')).toBeNull();
      fixture.nativeElement.querySelector('[data-day="tomorrow"] button').click();
      expect(getPrecios.calls.mostRecent().args).toEqual(['tomorrow']);
    });

    it('shows coverage but suppresses every derived output for incomplete data', () => {
      requests.today[0].next({
        selector: 'today', resolvedDate: '2026-08-21', timeZone: 'Europe/Madrid',
        expectedIntervalCount: 24, receivedIntervalCount: 23, state: 'incomplete',
        values: availableToday.values, reason: 'coverage_mismatch'
      });
      fixture.detectChanges();

      const today = fixture.nativeElement.querySelector('[data-day="today"]');
      expect(today.textContent).toContain('23 de 24 intervalos');
      expect(today.querySelector('[data-derived]')).toBeNull();
      expect(today.querySelector('[aria-label="Gráfico de precios de hoy"]')).toBeNull();
    });

    it('renders complete charts, metrics, and recommendations with DST-safe points', () => {
      const complete: AvailableResult = {
        ...availableToday,
        expectedIntervalCount: 2,
        receivedIntervalCount: 2,
        values: [availableToday.values[0], {
          startsAt: '2026-08-21T01:00:00+02:00', instant: new Date(Date.now() - 1000).toISOString(),
          utcOffsetMinutes: 120, valueEurMWh: 107.59
        }]
      };
      requests.today[0].next(complete);
      fixture.detectChanges();

      const today = fixture.nativeElement.querySelector('[data-day="today"]');
      expect(today.querySelectorAll('[data-instant]').length).toBe(2);
      const bars = today.querySelectorAll('[role="meter"]');
      expect(bars[0].getAttribute('aria-valuenow')).toBe('92.41');
      expect(bars[0].getAttribute('aria-valuemax')).toBe('107.59');
      expect(today.textContent).toContain('00:00');
      expect(today.textContent).toContain('Ahora');
      const values = Array.from(today.querySelectorAll('dd')).map((item: any) => item.textContent);
      expect(values).toContain('0,092 €/kWh');
      expect(values).toContain('0,108 €/kWh');
      expect(values).toContain('0,100 €/kWh');
      expect(today.textContent).toContain('Mejor hora: 00:00');
    });

    it('renders finite valid meters for zero, negative, and mixed-sign prices', () => {
      const cases = [
        { prices: [0, 0], heights: ['0%', '0%'] },
        { prices: [-20, -10], heights: ['0%', '100%'] },
        { prices: [-10, 10], heights: ['0%', '100%'] }
      ];

      for (const testCase of cases) {
        requests.today[0].next({
          ...availableToday, expectedIntervalCount: 2, receivedIntervalCount: 2,
          values: testCase.prices.map((valueEurMWh, index) => ({
            ...availableToday.values[0],
            startsAt: `2026-08-21T0${index}:00:00+02:00`,
            instant: `2026-08-20T2${2 + index}:00:00Z`, valueEurMWh
          }))
        });
        fixture.detectChanges();

        const bars = Array.from(fixture.nativeElement.querySelectorAll('[data-day="today"] [role="meter"]')) as HTMLElement[];
        expect(bars.map(bar => bar.style.height)).toEqual(testCase.heights);
        for (const bar of bars) {
          const [minimum, value, maximum] = ['aria-valuemin', 'aria-valuenow', 'aria-valuemax']
            .map(attribute => Number(bar.getAttribute(attribute)));
          expect(Number.isFinite(minimum) && Number.isFinite(value) && Number.isFinite(maximum)).toBeTrue();
          expect(minimum).toBeLessThan(maximum);
          expect(value).toBeGreaterThanOrEqual(minimum);
          expect(value).toBeLessThanOrEqual(maximum);
        }
      }
    });
  });
});
