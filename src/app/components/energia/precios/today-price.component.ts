import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvailableResult } from '../../../interfaces/data';
import { IconComponent } from '../../shared/icon/icon.component';
import { buildTodayPriceViewModel, TodayPriceViewModel } from './today-price';

@Component({
  selector: 'app-today-price',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-5" *ngIf="view">
      <article class="overflow-hidden rounded-[18px] border border-t-4 border-slate-100 bg-white px-6 py-7 shadow-[0_8px_24px_rgba(15,23,42,0.07)]" style="border-top-color:#0ea5e9" data-today-hero aria-labelledby="current-price-title">
        <p id="current-price-title" class="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700"><span class="mr-2 text-sky-500" aria-hidden="true">✓</span>Precio actual</p>
        <p class="my-5 text-[3.2rem] font-extrabold leading-none tracking-tight text-slate-950" *ngIf="view.currentPrice; else noCurrent">{{ view.currentPrice }} <span class="text-lg font-medium text-slate-700">€/kWh</span></p>
        <ng-template #noCurrent><p class="my-5 text-2xl font-bold text-slate-800">No disponible</p></ng-template>
        <p class="m-0 inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-600"><span class="mr-2" aria-hidden="true">●</span>{{ view.badge }}</p>
      </article>

      <article class="flex items-center gap-4 rounded-[18px] bg-[#073f78] px-5 py-6 text-white shadow-[0_8px_20px_rgba(7,63,120,0.18)]" data-recommendation aria-labelledby="recommendation-title">
        <span class="grid h-12 w-12 flex-none place-items-center rounded-full bg-sky-500/20 text-sky-200"><app-icon class="h-6 w-6" name="zap"></app-icon></span>
        <div><p class="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Recomendación del momento</p><h3 id="recommendation-title" class="mb-0 mt-2 text-lg font-bold leading-tight">{{ view.recommendation.title }}</h3><p class="mb-0 mt-1 text-sm leading-snug text-sky-50">{{ view.recommendation.copy }}</p></div>
      </article>

      <section class="rounded-[18px] bg-[#f0eeee] px-5 py-6 shadow-[0_6px_18px_rgba(15,23,42,0.04)]" aria-labelledby="today-chart-title">
        <div class="flex items-center justify-between"><h3 id="today-chart-title" class="m-0 text-xl font-medium text-slate-900">Evolución de precios</h3><span class="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Hoy</span></div>
        <ol class="chart-grid" aria-label="Gráfico de precios de hoy">
          <li *ngFor="let point of view.points; trackBy: trackPoint" [attr.data-instant]="point.key">
            <span class="bar-slot"><span class="bar" role="meter" [attr.data-band]="point.band"
              [attr.aria-label]="point.label + ', ' + point.formattedPrice + ' €/kWh, precio ' + point.bandLabel"
              [attr.aria-valuemin]="point.meterMinimum" [attr.aria-valuenow]="point.valueEurMWh"
              [attr.aria-valuemax]="point.meterMaximum" [attr.aria-current]="point.isCurrent ? 'time' : null" [style.height.%]="point.height"></span></span>
            <span *ngIf="point.axisLabel" data-axis-label>{{ point.axisLabel }}</span><strong class="sr-only" *ngIf="point.isCurrent">Ahora</strong>
          </li>
        </ol>
      </section>

      <dl class="grid grid-cols-2 gap-4" data-today-summary>
        <div class="rounded-[16px] border-t-4 border-sky-400 bg-white p-4 shadow-sm"><dt class="text-sm font-medium text-slate-700">↓ Mínimo</dt><dd class="mb-0 ml-0 mt-3 font-mono text-2xl font-bold">{{ view.summary.minimum }} <small class="text-xs">€/kWh</small></dd><p class="mb-0 mt-3 text-xs text-slate-500">◷ {{ view.summary.minimumTime }}</p></div>
        <div class="rounded-[16px] border-t-4 border-red-500 bg-white p-4 shadow-sm"><dt class="text-sm font-medium text-slate-700">↑ Máximo</dt><dd class="mb-0 ml-0 mt-3 font-mono text-2xl font-bold">{{ view.summary.maximum }} <small class="text-xs">€/kWh</small></dd><p class="mb-0 mt-3 text-xs text-slate-500">◷ {{ view.summary.maximumTime }}</p></div>
        <div class="col-span-2 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[16px] bg-slate-200 p-4"><span class="text-2xl" aria-hidden="true">Σ</span><div><dt class="text-sm font-semibold text-slate-700">Media diaria</dt><p class="m-0 text-xs text-slate-500">Promedio de 24h</p></div><dd class="m-0 font-mono text-xl font-bold">{{ view.summary.average }} <small class="text-xs">€/kWh</small></dd></div>
      </dl>
    </div>
  `,
  styles: [`
    :host{display:block}.chart-grid{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:3px;height:11rem;margin:1.25rem 0 0;padding:0;list-style:none}.chart-grid li{display:grid;grid-template-rows:1fr 1rem;min-width:0;text-align:center;font-size:.65rem;color:#374151}.bar-slot{display:flex;align-items:flex-end;min-width:0;height:100%;border-bottom:1px solid #c7c7c7}.bar{display:block;width:100%;min-height:4px;border-radius:3px 3px 0 0}.bar[data-band=low]{background:#38bdf8}.bar[data-band=medium]{background:#fbbf24}.bar[data-band=high]{background:#ef7668}.bar[aria-current=time]{outline:2px solid #073f78;outline-offset:1px}
  `]
})
export class TodayPriceComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) result!: AvailableResult;
  view!: TodayPriceViewModel;
  private timer?: number;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updateView();
    this.scheduleNextRefresh();
  }

  ngOnChanges(): void { this.updateView(); }
  ngOnDestroy(): void { if (this.timer !== undefined) window.clearTimeout(this.timer); }
  trackPoint(_: number, point: { readonly key: string }): string { return point.key; }
  private updateView(): void { if (this.result) this.view = buildTodayPriceViewModel(this.result); }
  private scheduleNextRefresh(): void {
    const delay = 60_000 - Date.now() % 60_000;
    this.timer = window.setTimeout(() => {
      this.updateView();
      this.changeDetector.markForCheck();
      this.scheduleNextRefresh();
    }, delay);
  }
}
