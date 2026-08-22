import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { AvailableResult } from '../../../interfaces/data';
import { buildTomorrowPriceViewModel, TomorrowPriceViewModel } from './tomorrow-price';

@Component({
  selector: 'app-tomorrow-price', standalone: true, imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-6" *ngIf="view">
      <div class="flex items-center gap-4 rounded-[18px] bg-slate-200 px-5 py-4" role="status" data-tomorrow-status>
        <span class="grid h-11 w-11 flex-none place-items-center rounded-full bg-white text-2xl" aria-hidden="true">✓</span>
        <p class="m-0 text-base leading-snug text-slate-800"><strong>Precios de mañana</strong><br><span>Pronóstico publicado</span></p>
      </div>
      <section aria-labelledby="forecast-title"><h2 id="forecast-title" class="mb-5 mt-4 text-3xl font-medium">Pronóstico</h2>
        <div class="grid grid-cols-2 gap-4">
          <article class="rounded-[18px] border-t-4 border-emerald-500 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]" data-forecast-card><p class="m-0 text-sm uppercase text-slate-700">Media</p><p class="mb-2 mt-5 font-mono text-3xl font-bold">{{ view.forecast.average }}<small class="ml-1 text-sm font-medium">€/kWh</small></p><p class="m-0 text-sm font-semibold text-emerald-600" *ngIf="view.forecast.variation; else noComparison">{{ view.forecast.variation }}</p><ng-template #noComparison><p class="m-0 text-xs text-slate-500">Sin comparación con hoy</p></ng-template></article>
          <article class="rounded-[18px] border-t-4 border-sky-500 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]" data-forecast-card><p class="m-0 text-sm uppercase text-slate-700">Mínimo</p><p class="mb-2 mt-5 font-mono text-3xl font-bold">{{ view.forecast.minimum }}<small class="ml-1 text-sm font-medium">€/kWh</small></p><p class="m-0 text-sm text-slate-700">◷ {{ view.forecast.minimumTime }}</p></article>
        </div>
      </section>
      <section class="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(15,23,42,.07)]" aria-labelledby="tomorrow-chart-title"><h2 id="tomorrow-chart-title" class="m-0 text-xl font-bold">Evolución del precio</h2>
        <ol class="chart-grid" [style.--point-count]="view.points.length" aria-label="Gráfico de previsión de precios de mañana">
          <li *ngFor="let point of view.points; trackBy: trackPoint" [attr.data-instant]="point.key"><span class="bar-slot"><span class="bar" role="meter" [attr.data-band]="point.band" [style.height.%]="point.height" [attr.aria-valuemin]="point.meterMinimum" [attr.aria-valuenow]="point.valueEurMWh" [attr.aria-valuemax]="point.meterMaximum" [attr.aria-label]="point.label + ', ' + point.formattedPrice + ' €/kWh, precio ' + point.bandLabel"></span></span><span *ngIf="point.axisLabel" data-axis-label>{{ point.axisLabel }}</span></li>
        </ol>
      </section>
      <section aria-labelledby="best-hours-title"><h2 id="best-hours-title" class="mb-5 mt-4 text-3xl font-medium">Mejores horas</h2>
        <ol class="m-0 grid list-none gap-3 p-0"><li *ngFor="let hour of view.bestHours; trackBy: trackBest" class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[16px] border-l-4 border-sky-500 bg-white px-5 py-4 shadow-sm" data-best-hour><div><strong class="font-mono text-xl">{{ hour.range }}</strong><p class="mb-0 mt-1 text-sm text-slate-600">{{ hour.copy }}</p></div><div class="text-right"><strong class="font-mono text-lg">{{ hour.price }}€</strong><p class="mb-0 mt-2 inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase text-sky-600">{{ hour.bandLabel }}</p></div></li></ol>
      </section>
    </div>`,
  styles: [`:host{display:block}.chart-grid{display:grid;grid-template-columns:repeat(var(--point-count),minmax(0,1fr));gap:3px;height:13rem;margin:1.5rem 0 0;padding:0;list-style:none}.chart-grid li{display:grid;grid-template-rows:1fr 1rem;min-width:0;text-align:center;font-size:.65rem;color:#374151}.bar-slot{display:flex;align-items:flex-end;height:100%;border-block:1px solid #e2e8f0}.bar{display:block;width:100%;min-height:4px;border-radius:3px 3px 0 0}.bar[data-band=low]{background:#2db7df}.bar[data-band=medium]{background:#fbbf24}.bar[data-band=high]{background:#eb6b59}`]
})
export class TomorrowPriceComponent implements OnChanges {
  @Input({ required: true }) result!: AvailableResult;
  @Input() todayResult: AvailableResult | null = null;
  view!: TomorrowPriceViewModel;
  ngOnChanges(): void { if (this.result) this.view = buildTomorrowPriceViewModel(this.result, this.todayResult); }
  trackPoint(_: number, point: { readonly key: string }): string { return point.key; }
  trackBest(_: number, hour: { readonly key: string }): string { return hour.key; }
}
