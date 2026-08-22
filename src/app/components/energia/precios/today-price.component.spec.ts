import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailableResult } from '../../../interfaces/data';
import { TodayPriceComponent } from './today-price.component';

describe('TodayPriceComponent', () => {
  let fixture: ComponentFixture<TodayPriceComponent>;
  const result: AvailableResult = {
    selector: 'today', resolvedDate: '2026-08-21', timeZone: 'Europe/Madrid',
    expectedIntervalCount: 3, receivedIntervalCount: 3, state: 'available',
    values: [10, 20, 30].map((valueEurMWh, hour) => ({
      startsAt: `2026-08-21T0${hour}:00:00+02:00`,
      instant: new Date(Date.parse('2026-08-20T22:00:00Z') + hour * 3_600_000).toISOString(),
      utcOffsetMinutes: 120, valueEurMWh
    }))
  };

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-08-20T22:30:00Z'));
    await TestBed.configureTestingModule({ imports: [TodayPriceComponent] }).compileComponents();
    fixture = TestBed.createComponent(TodayPriceComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('renders the current-price hero, contextual recommendation, chart, and summary cards', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[data-today-hero]')?.textContent).toContain('0,010 €/kWh');
    expect(element.querySelector('[data-today-hero]')?.textContent).toContain('Precio valle hasta las 01:00');
    expect(element.querySelector('[data-recommendation]')?.textContent).toContain('Buen momento para consumir');
    expect(element.querySelectorAll('[role="meter"]').length).toBe(3);
    expect(element.querySelector('[aria-label="Gráfico de precios de hoy"]')?.textContent).toContain('Ahora');
    expect(element.querySelector('[data-today-summary]')?.textContent).toContain('Mínimo');
    expect(element.querySelector('[data-today-summary]')?.textContent).toContain('Media diaria');
  });

  it('keeps every bar accessible and exposes its classified semantic label', () => {
    const meters = Array.from(fixture.nativeElement.querySelectorAll('[role="meter"]')) as HTMLElement[];

    expect(meters.map(meter => meter.getAttribute('aria-label'))).toEqual([
      '00:00, 0,010 €/kWh, precio valle',
      '01:00, 0,020 €/kWh, precio medio',
      '02:00, 0,030 €/kWh, precio punta'
    ]);
  });

  it('renders all 24 accessible bars with only four sparse visible hour ticks', () => {
    fixture.componentRef.setInput('result', {
      ...result, expectedIntervalCount: 24, receivedIntervalCount: 24,
      values: Array.from({ length: 24 }, (_, hour) => ({
        startsAt: `2026-08-21T${hour.toString().padStart(2, '0')}:00:00+02:00`,
        instant: new Date(Date.parse('2026-08-20T22:00:00Z') + hour * 3_600_000).toISOString(),
        utcOffsetMinutes: 120, valueEurMWh: 10 + hour
      }))
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="meter"]').length).toBe(24);
    const ticks = Array.from(fixture.nativeElement.querySelectorAll('[data-axis-label]')) as HTMLElement[];
    expect(ticks.map(tick => tick.textContent?.trim())).toEqual(['0h', '6h', '12h', '18h']);
  });

  it('refreshes exactly on the next clock-minute boundary and clears the timer on destroy', () => {
    jasmine.clock().tick(29 * 60_000 + 59_999);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-today-hero]')?.textContent).toContain('0,010 €/kWh');

    jasmine.clock().tick(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-today-hero]')?.textContent).toContain('0,020 €/kWh');

    const viewAtDestroy = fixture.componentInstance.view;
    fixture.destroy();
    jasmine.clock().tick(60_000);
    expect(fixture.componentInstance.view).toBe(viewAtDestroy);
  });
});
