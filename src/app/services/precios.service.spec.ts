import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AvailableResult, DayPriceResult, UnavailableResult } from '../interfaces/data';
import { PreciosService } from './precios.service';

describe('PreciosService', () => {
  const baseUrl = 'https://app-tarifa-luz-back.vercel.app/api/precios';
  let httpTestingController: HttpTestingController;
  let service: PreciosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PreciosService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('requests today and returns its typed available result', () => {
    const response: AvailableResult = {
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
    let result: DayPriceResult | undefined;

    service.getPrecios('today').subscribe(value => result = value);

    const request = httpTestingController.expectOne(
      `${baseUrl}?day=today`
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('requests tomorrow independently and returns its typed unavailable result', () => {
    const response: UnavailableResult = {
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
    let result: DayPriceResult | undefined;

    service.getPrecios('tomorrow').subscribe(value => result = value);

    const request = httpTestingController.expectOne(
      `${baseUrl}?day=tomorrow`
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(result).toEqual(response);
  });
});
