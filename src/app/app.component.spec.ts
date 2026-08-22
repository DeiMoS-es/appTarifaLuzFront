import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER } from 'rxjs';
import { AppComponent } from './app.component';
import { PreciosComponent } from './components/energia/precios/precios.component';
import { BottomNavigationComponent } from './components/shared/bottom-navigation/bottom-navigation.component';
import { HeaderComponent } from './components/shared/header/header.component';
import { PreciosService } from './services/precios.service';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      CommonModule,
      RouterTestingModule.withRoutes([{ path: 'precios', component: PreciosComponent }]),
      HeaderComponent,
      BottomNavigationComponent
    ],
    declarations: [AppComponent, PreciosComponent],
    providers: [{ provide: PreciosService, useValue: { getPrecios: () => NEVER } }]
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

  it('reaches the rendered pricing sections from Today and Tomorrow navigation', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    await router.navigateByUrl('/precios');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('nav a')) as HTMLAnchorElement[];
    const history = compiled.querySelector('[aria-label="Historial, próximamente"]') as HTMLButtonElement;

    expect(router.url).toBe('/precios');
    expect(links).toHaveSize(2);
    for (const [index, expected] of ['Hoy', 'Mañana'].entries()) {
      const target = compiled.querySelector(links[index].hash);
      expect(target?.textContent).toContain(expected);
      expect(target?.closest('[data-day]')?.getAttribute('data-day')).toBe(index === 0 ? 'today' : 'tomorrow');
    }
    expect(history.disabled).toBeTrue();
    expect(compiled.querySelectorAll('app-icon svg[aria-hidden="true"]')).toHaveSize(6);
  });
});
