import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailableResult, UnavailableResult } from '../../../interfaces/data';
import { TomorrowPriceComponent } from './tomorrow-price.component';
import { TomorrowUnavailableComponent } from './tomorrow-unavailable.component';

describe('Tomorrow presentation components', () => {
  const tomorrow: AvailableResult = {
    selector: 'tomorrow', resolvedDate: '2026-08-22', timeZone: 'Europe/Madrid',
    expectedIntervalCount: 4, receivedIntervalCount: 4, state: 'available',
    values: [40, 10, 20, 30].map((valueEurMWh, hour) => ({
      startsAt: `2026-08-22T0${hour}:00:00+02:00`,
      instant: new Date(Date.parse('2026-08-21T22:00:00Z') + hour * 3_600_000).toISOString(),
      utcOffsetMinutes: 120, valueEurMWh
    }))
  };

  it('renders two forecast cards, accessible meters, and three best hours', async () => {
    await TestBed.configureTestingModule({ imports: [TomorrowPriceComponent] }).compileComponents();
    const fixture: ComponentFixture<TomorrowPriceComponent> = TestBed.createComponent(TomorrowPriceComponent);
    fixture.componentRef.setInput('result', tomorrow);
    fixture.componentRef.setInput('todayResult', { ...tomorrow, selector: 'today', values: tomorrow.values.map(value => ({ ...value, valueEurMWh: 25 })) });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('[data-forecast-card]')).toHaveSize(2);
    expect(element.textContent).toContain('→ 0% vs hoy');
    expect(element.querySelectorAll('[role="meter"]')).toHaveSize(4);
    expect(element.querySelectorAll('[data-best-hour]')).toHaveSize(3);
    expect(element.querySelector('[aria-label="Gráfico de previsión de precios de mañana"]')).not.toBeNull();
  });

  it('shows publication status and keeps notification capability honestly disabled', async () => {
    await TestBed.configureTestingModule({ imports: [TomorrowUnavailableComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TomorrowUnavailableComponent);
    const unavailable: UnavailableResult = {
      selector: 'tomorrow', resolvedDate: '2026-08-22', timeZone: 'Europe/Madrid',
      expectedIntervalCount: 24, receivedIntervalCount: 0, state: 'unavailable', values: [],
      retryable: true, reason: 'before_publication', expectedPublicationAt: '2026-08-21T20:15:00+02:00'
    };
    fixture.componentRef.setInput('result', unavailable);
    let notified = false;
    let retried = false;
    fixture.componentInstance.notifyRequested.subscribe(() => notified = true);
    fixture.componentInstance.retryRequested.subscribe(() => retried = true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const notify = element.querySelector('[data-notify]') as HTMLButtonElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain('20:15');
    expect(notify.disabled).toBeTrue();
    expect(notify.getAttribute('title')).toContain('próximamente');
    notify.click();
    expect(notified).toBeFalse();
    (element.querySelector('[data-retry]') as HTMLButtonElement).click();
    expect(retried).toBeTrue();
    expect(element.querySelector('[data-forecast-card]')).toBeNull();
  });
});
