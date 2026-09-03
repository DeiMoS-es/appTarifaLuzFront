import { Component, OnInit } from '@angular/core';
import { HistoricoService } from 'src/app/services/historico.service';
import { PrecioDiario, PriceZone } from 'src/app/interfaces/data';

type Range = 'semana' | 'mes' | 'anio';

@Component({
  selector: 'app-historico',
  templateUrl: './historico.component.html',
  styleUrls: ['./historico.component.css']
})
export class HistoricoComponent implements OnInit {
  range: Range = 'semana';
  selectedZone: PriceZone = 'peninsular';
  readonly zones: PriceZone[] = ['peninsular', 'canarias', 'baleares', 'ceuta', 'melilla'];
  loading = false;
  error: string | null = null;
  values: PrecioDiario[] = [];

  // chart derived
  chartPath = '';
  chartPoints: { x: number; y: number; value: number; label: string; meta?: PrecioDiario }[] = [];
  // axis ticks
  chartXAxisTicks: { x: number; label: string }[] = [];
  chartYAxisTicks: { y: number; label: string }[] = [];
  // values to display in the list (newest first)
  displayValues: PrecioDiario[] = [];

  // tooltip state
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  // structured meta for template rendering (avoid innerHTML)
  tooltipMeta: { dateText: string; avgText: string; minText: string; maxText: string } | null = null;
  tooltipArrowX = 0; // position of arrow inside tooltip (px)
  tooltipLocked = false; // tap-to-lock state
  currentTooltipPointIndex: number | null = null;

  // drilldown
  selectedWeekStart: string | null = null;
  selectedWeekDays: PrecioDiario[] | null = null;


  constructor(private historicoService: HistoricoService) {}

  ngOnInit(): void {
    this.load(this.range);
  }

  select(range: Range) {
    if (this.range === range) return;
    this.range = range;
    this.load(range);
  }

  changeZone(zone: PriceZone): void {
    if (this.selectedZone === zone) return;
    this.selectedZone = zone;
    this.load(this.range);
  }

  private load(range: Range) {
    this.loading = true;
    this.error = null;
    this.values = [];
    const obs = range === 'semana' ? this.historicoService.getSemana(this.selectedZone)
      : range === 'mes' ? this.historicoService.getMes(this.selectedZone)
      : this.historicoService.getAnio(this.selectedZone);

    obs.subscribe({
      next: resp => {
        try {
          this.values = resp.values || [];
          // keep chart data chronological (oldest -> newest)
          this.buildChart();
          // reverse a copy for list display so newest appears first
          this.displayValues = [...this.values].reverse();
          this.selectedWeekDays = null;
          this.selectedWeekStart = null;
        } catch (e) {
          // Ensure any rendering errors don't leave the UI stuck in loading
          // Log to console for debugging and surface a generic error to the user
          try { console.error('historico build error', e); } catch(e2) {}
          this.error = 'Error procesando datos históricos';
        } finally {
          this.loading = false;
        }
      },
      error: err => {
        this.error = err?.message || 'No se pudieron cargar los datos históricos';
        this.loading = false;
      }
    });
  }

  // Build a simple SVG line path from daily media values and compute axis ticks
  private buildChart(): void {
    // Build chart while gracefully handling missing days (media === null).
    // Keep chartPoints in 1:1 correspondence with this.values so tooltips and
    // interactions remain indexed, but compute path only for defined points.
    const width = 600; // viewBox width
    const height = 200; // ViewBox height
    const padding = 30;
    const count = this.values.length;
    if (count === 0) {
      this.chartPath = '';
      this.chartPoints = [];
      this.chartXAxisTicks = [];
      this.chartYAxisTicks = [];
      return;
    }

    const valueNums = this.values.map(v => v.media);
    const finiteNums = valueNums.filter(n => n !== null && Number.isFinite(n)) as number[];
    if (finiteNums.length === 0) {
      // No numeric data to draw
      this.chartPath = '';
      this.chartPoints = this.values.map((v, i) => ({ x: padding + i, y: null as any, value: null as any, label: this.dayLabel(v.fecha), meta: v }));
      this.chartXAxisTicks = [];
      this.chartYAxisTicks = [];
      return;
    }

    const min = Math.min(...finiteNums);
    const max = Math.max(...finiteNums);
    const span = max - min || 1;
    const stepX = (width - padding * 2) / Math.max(1, count - 1);

    const points: { x: number; y: number | null; value: number | null; label: string; meta?: PrecioDiario }[] = [];
    for (let i = 0; i < count; i++) {
      const x = padding + i * stepX;
      const val = this.values[i].media;
      let y: number | null = null;
      if (val !== null && Number.isFinite(val)) {
        const normalized = (val - min) / span;
        y = padding + (1 - normalized) * (height - padding * 2);
      }
      const label = this.dayLabel(this.values[i].fecha);
      points.push({ x, y, value: val, label, meta: this.values[i] });
    }

    // Build smooth path for contiguous segments of defined points
    const dSegments: string[] = [];
    let segmentPoints: { x: number; y: number }[] = [];
    const pushSegmentPath = (seg: { x: number; y: number }[]) => {
      if (seg.length === 0) return;
      const segD: string[] = [];
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i];
        if (i === 0) segD.push(`M ${p.x} ${p.y}`);
        else {
          const prev = seg[i - 1];
          const cx = (prev.x + p.x) / 2;
          segD.push(`Q ${prev.x} ${prev.y} ${cx} ${(prev.y + p.y) / 2}`);
          segD.push(`T ${p.x} ${p.y}`);
        }
      }
      dSegments.push(segD.join(' '));
    };

    for (const p of points) {
      if (p.y === null) {
        // flush existing segment
        pushSegmentPath(segmentPoints);
        segmentPoints = [];
      } else {
        segmentPoints.push({ x: p.x, y: p.y });
      }
    }
    // flush last
    pushSegmentPath(segmentPoints);

    // Compute Y axis ticks: min, avg, max (converted to display cts)
    const avg = this.overallAverage() ?? (min + max) / 2;
    const yVals = [min, avg, max];
    this.chartYAxisTicks = yVals.map(v => {
      const normalized = (v - min) / span;
      const y = padding + (1 - normalized) * (height - padding * 2);
      return { y, label: this.formatCurrency(v) };
    });

    // Compute X axis ticks depending on range
    const xTicks: { x: number; label: string }[] = [];
    if (this.range === 'anio') {
      // pick one tick per month: find first occurrence index for each month
      const seen = new Set<number>();
      for (let i = 0; i < this.values.length; i++) {
        const d = new Date(this.values[i].fecha + 'T00:00:00');
        const m = d.getMonth();
        if (!seen.has(m)) {
          seen.add(m);
          xTicks.push({ x: padding + i * stepX, label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase() });
        }
        if (seen.size >= 12) break;
      }
    } else if (this.range === 'mes') {
      // for month, show every ~5 days to avoid clutter
      const step = Math.max(1, Math.floor(count / 6));
      for (let i = 0; i < count; i += step) {
        const d = new Date(this.values[i].fecha + 'T00:00:00');
        xTicks.push({ x: padding + i * stepX, label: String(d.getDate()) });
      }
      // ensure last day label present
      const last = this.values.length - 1;
      if (last >= 0) {
        const d = new Date(this.values[last].fecha + 'T00:00:00');
        xTicks.push({ x: padding + last * stepX, label: String(d.getDate()) });
      }
    } else {
      // semana: show weekday names for each point
      for (let i = 0; i < this.values.length; i++) {
        const d = new Date(this.values[i].fecha + 'T00:00:00');
        xTicks.push({ x: padding + i * stepX, label: d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase() });
      }
    }

    this.chartPath = dSegments.join(' ');
    this.chartPoints = points as any;
    this.chartXAxisTicks = xTicks;
  }

  // Tooltip helpers
  showTooltipAtPoint(point: { x: number; y: number; value: number; label: string; meta?: PrecioDiario }, ev: MouseEvent | TouchEvent) {
    // position relative to chart-area
    const chartEl = (document.querySelector('.chart-area') as HTMLElement);
    if (!chartEl) return;
    const rect = chartEl.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    if (ev instanceof MouseEvent) { clientX = ev.clientX; clientY = ev.clientY; }
    else if ((ev as TouchEvent).touches && (ev as TouchEvent).touches.length) {
      clientX = (ev as TouchEvent).touches[0].clientX;
      clientY = (ev as TouchEvent).touches[0].clientY;
    }

    // Set initial tooltip position (above the pointer). We'll clamp after rendering.
    this.tooltipX = clientX - rect.left;
    this.tooltipY = clientY - rect.top - 40; // above pointer

    const meta = point.meta;
    const dateText = meta ? `${meta.fecha}` : '';
    const minText = meta && meta.minimo !== null ? `${(meta.minimo/10).toFixed(1)} cts` : '—';
    const maxText = meta && meta.maximo !== null ? `${(meta.maximo/10).toFixed(1)} cts` : '—';
    const avgText = meta && meta.media !== null ? `${(meta.media/10).toFixed(1)} cts` : '—';

    // populate structured meta for template rendering
    this.tooltipMeta = { dateText, avgText, minText, maxText };
    this.tooltipVisible = true;

    // remember which point triggered tooltip (index) to support tap-to-lock toggle
    this.currentTooltipPointIndex = this.chartPoints.indexOf(point);

    // Allow DOM to render the tooltip then clamp its position to the visible chart area and compute arrow position
    setTimeout(() => {
      const tt = chartEl.querySelector('.chart-tooltip') as HTMLElement | null;
      if (!tt) return;
      const ttRect = tt.getBoundingClientRect();
      const chartRect = chartEl.getBoundingClientRect();
      let tx = this.tooltipX;
      let ty = this.tooltipY;

      // If it overflows right edge, move left
      if (tx + ttRect.width > chartRect.width) tx = Math.max(8, chartRect.width - ttRect.width - 8);
      // If it overflows left edge, move right
      if (tx < 8) tx = 8;
      // Clamp vertically
      if (ty < 8) ty = 8;
      if (ty + ttRect.height > chartRect.height) ty = Math.max(8, chartRect.height - ttRect.height - 8);

      // Compute arrow position inside tooltip: targetX (relative to chart) - tooltipLeft
      const targetX = clientX - rect.left;
      let arrowX = targetX - tx;
      // keep arrow inside tooltip padding bounds
      const pad = 10;
      if (arrowX < pad) arrowX = pad;
      if (arrowX > ttRect.width - pad) arrowX = ttRect.width - pad;

      this.tooltipArrowX = arrowX;
      this.tooltipX = tx;
      this.tooltipY = ty;
    }, 0);
  }

  hideTooltip(force = false) {
    // hide only if not locked, unless force == true
    if (!force && this.tooltipLocked) return;
    this.tooltipVisible = false;
    this.tooltipMeta = null;
    this.currentTooltipPointIndex = null;
    this.tooltipLocked = false;
  }

  // Touch handler for tap-to-lock behavior
  onTouchPoint(point: { x: number; y: number; value: number; label: string; meta?: PrecioDiario }, ev: TouchEvent) {
    ev.preventDefault();
    const idx = this.chartPoints.indexOf(point);
    if (this.tooltipLocked && this.currentTooltipPointIndex === idx) {
      // toggle off
      this.tooltipLocked = false;
      this.hideTooltip(true);
      return;
    }
    // lock tooltip on tap
    this.tooltipLocked = true;
    this.currentTooltipPointIndex = idx;
    this.showTooltipAtPoint(point, ev);
  }

  async onPointClick(point: { x: number; y: number; value: number; label: string; meta?: PrecioDiario }) {
    if (!point.meta) return;
    // toggle selection
    const start = point.meta.fecha;
    if (this.selectedWeekStart === start) {
      this.selectedWeekStart = null;
      this.selectedWeekDays = null;
      return;
    }
    this.selectedWeekStart = start;
    try {
      const resp = await this.historicoService.getWeek(start, this.selectedZone).toPromise();
      this.selectedWeekDays = (resp && resp.values) ? resp.values : [];
    } catch (err) {
      this.selectedWeekDays = null;
    }
  }

  dayLabel(fecha: string): string {
    try {
      const d = new Date(fecha + 'T00:00:00');
      if (this.range === 'mes') {
        // For month range show numeric day for clarity
        return String(d.getDate());
      }
      if (this.range === 'anio') {
        // For year range show month abbreviation
        return d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      }
      return d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    } catch {
      return '';
    }
  }

  averageFor(values: PrecioDiario[]): number | null {
    const nums = values.map(v => v.media).filter(n => n !== null) as number[];
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  insightSummary(): { title: string; text: string } {
    if (this.values.length < 2) {
      return {
        title: 'Resumen',
        text: 'No hay suficiente información para comparar tendencias.'
      };
    }

    const pivot = (() => {
      switch (this.range) {
        case 'semana':
          return Math.max(2, Math.ceil(this.values.length / 2));
        case 'mes':
          return Math.max(5, Math.ceil(this.values.length / 2));
        case 'anio':
          return Math.ceil(this.values.length / 2);
        default:
          return Math.ceil(this.values.length / 2);
      }
    })();

    const previous = this.values.slice(0, pivot);
    const current = this.values.slice(pivot);
    const previousAvg = this.averageFor(previous);
    const currentAvg = this.averageFor(current);

    if (previousAvg === null || currentAvg === null) {
      return {
        title: 'Resumen',
        text: 'Todavía no hay datos suficientes para comparar.'
      };
    }

    const delta = ((currentAvg - previousAvg) / previousAvg) * 100;
    const abs = Math.abs(delta);

    if (delta < -5) {
      return {
        title: 'Buen ritmo',
        text: `La media de ${this.range === 'semana' ? 'esta semana' : this.range === 'mes' ? 'este mes' : 'este año'} ha sido un <strong>${abs.toFixed(1)}% más barata</strong> que la anterior.`
      };
    }

    if (delta > 5) {
      return {
        title: 'Más cara',
        text: `La media de ${this.range === 'semana' ? 'esta semana' : this.range === 'mes' ? 'este mes' : 'este año'} ha sido un <strong>${abs.toFixed(1)}% más cara</strong> que la anterior.`
      };
    }

    return {
      title: 'Estable',
      text: `La media de ${this.range === 'semana' ? 'esta semana' : this.range === 'mes' ? 'este mes' : 'este año'} está <strong>muy cercana</strong> a la anterior (${abs.toFixed(1)}% de diferencia).`
    };
  }

  overallAverage(): number | null {
    return this.averageFor(this.values);
  }

  overallMin(): number | null {
    const nums = this.values.map(v => v.minimo).filter(n => n !== null) as number[];
    if (nums.length === 0) return null;
    return Math.min(...nums);
  }

  overallMax(): number | null {
    const nums = this.values.map(v => v.maximo).filter(n => n !== null) as number[];
    if (nums.length === 0) return null;
    return Math.max(...nums);
  }

  formatCurrency(value: number | null): string {
    if (value === null) return '—';
    // Convert to cts/kWh and round to nearest integer for axis readability (opción A)
    const cts = value / 10;
    return `${Math.round(cts)} cts`;
  }

  // helpers for list: weekday name and day number
  dayNumber(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return String(d.getDate());
  }

  private statusThreshold = 0.05; // 5%

  // Determine status based on overall average and thresholds
  dayStatus(v: PrecioDiario): 'barato' | 'normal' | 'caro' {
    const avg = this.overallAverage();
    if (avg === null || v.media === null) return 'normal';
    const val = v.media;
    if (val <= avg * (1 - this.statusThreshold)) return 'barato';
    if (val >= avg * (1 + this.statusThreshold)) return 'caro';
    return 'normal';
  }

  statusColorFor(v: PrecioDiario): string {
    const status = this.dayStatus(v);
    if (status === 'barato') return '#36B37E'; // green
    if (status === 'caro') return '#FF4D4F'; // red
    return '#1E90FF'; // blue for normal
  }

  statusLabel(v: PrecioDiario): string {
    const status = this.dayStatus(v);
    if (status === 'barato') return 'Barato';
    if (status === 'caro') return 'Caro';
    return 'Normal';
  }

}
