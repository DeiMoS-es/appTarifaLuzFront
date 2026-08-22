import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment, UrlSegmentGroup } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER } from 'rxjs';
import { AppComponent } from './app.component';
import { dayMatcher, routes } from './app-routing.module';
import { PreciosComponent } from './components/energia/precios/precios.component';
import { BottomNavigationComponent } from './components/shared/bottom-navigation/bottom-navigation.component';
import { HeaderComponent } from './components/shared/header/header.component';
import { PreciosService } from './services/precios.service';

describe('AppComponent', () => {
  let getPrecios: jasmine.Spy;

  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      CommonModule,
      RouterTestingModule.withRoutes(routes, { bindToComponentInputs: true }),
      HeaderComponent,
      BottomNavigationComponent
    ],
    declarations: [AppComponent, PreciosComponent],
    providers: [{
      provide: PreciosService,
      useFactory: () => ({ getPrecios: getPrecios = jasmine.createSpy('getPrecios').and.returnValue(NEVER) })
    }]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the Lumina shell with accessible controls', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header')?.textContent).toContain('Lumina');
    const settings = compiled.querySelector('[aria-label="Ajustes, próximamente"]') as HTMLButtonElement;
    const profile = compiled.querySelector('[aria-label="Perfil de usuario, próximamente"]') as HTMLButtonElement;
    expect(settings.tagName).toBe('BUTTON');
    expect(settings.disabled).toBeTrue();
    expect(profile.tagName).toBe('BUTTON');
    expect(profile.disabled).toBeTrue();
    expect(compiled.querySelector('nav[aria-label="Navegación principal"]')).toBeTruthy();
  });

  it('redirects root and the legacy route to Today', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(router.url).toBe('/hoy');
    expect(fixture.nativeElement.querySelector('[data-day="today"]')).not.toBeNull();
    await router.navigateByUrl('/precios');
    fixture.detectChanges();
    expect(router.url).toBe('/hoy');
  });

  it('matches only the canonical day URLs', () => {
    const match = (...paths: string[]) => dayMatcher(
      paths.map(path => new UrlSegment(path, {})), new UrlSegmentGroup([], {}), {}
    );

    expect(match('hoy')?.posParams?.['selectedDay'].path).toBe('today');
    expect(match('manana')?.posParams?.['selectedDay'].path).toBe('tomorrow');
    expect(match('desconocida')).toBeNull();
    expect(match('hoy', 'extra')).toBeNull();
  });

  it('uses real route links and keeps History honestly disabled', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/hoy');
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('nav a')) as HTMLAnchorElement[];
    const history = compiled.querySelector('[aria-label="Historial, próximamente"]') as HTMLButtonElement;

    expect(compiled.querySelector('header a')?.getAttribute('href')).toBe('/hoy');
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/hoy', '/manana']);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(history.disabled).toBeTrue();
    expect(compiled.querySelectorAll('app-icon svg[aria-hidden="true"]')).toHaveSize(6);
  });

  it('reuses one price component without stale content or repeated initial loads', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    let initialComponent: PreciosComponent | undefined;

    for (const [url, day] of [['/hoy', 'today'], ['/manana', 'tomorrow'], ['/hoy', 'today']] as const) {
      await router.navigateByUrl(url);
      fixture.detectChanges();
      const routedComponent = fixture.debugElement.query(By.directive(PreciosComponent)).componentInstance as PreciosComponent;
      initialComponent ??= routedComponent;
      expect(routedComponent).toBe(initialComponent);
      const selected = fixture.nativeElement.querySelector('[data-day]') as HTMLElement;
      expect(selected.getAttribute('data-day')).toBe(day);
      expect(fixture.nativeElement.querySelectorAll('[data-day]')).toHaveSize(1);
    }

    expect(getPrecios.calls.allArgs()).toEqual([['today'], ['tomorrow']]);
  });
});
