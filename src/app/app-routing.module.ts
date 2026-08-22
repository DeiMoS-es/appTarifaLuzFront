import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { PreciosComponent } from './components/energia/precios/precios.component';
import { DaySelector } from './interfaces/data';

export const dayMatcher: UrlMatcher = segments => {
  if (segments.length !== 1) return null;

  const selectedDay: DaySelector | undefined = segments[0].path === 'hoy'
    ? 'today'
    : segments[0].path === 'manana' ? 'tomorrow' : undefined;

  return selectedDay
    ? { consumed: segments, posParams: { selectedDay: new UrlSegment(selectedDay, {}) } }
    : null;
};

export const routes: Routes = [
  { path: '', redirectTo: '/hoy', pathMatch: 'full' },
  { path: 'precios', redirectTo: '/hoy', pathMatch: 'full' },
  { matcher: dayMatcher, component: PreciosComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
