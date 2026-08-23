import { Component, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PreciosService } from 'src/app/services/precios.service';
import * as d3 from 'd3';
import { AvailableResult, Data, DayPriceResult, DaySelector, FailureResult, PriceZone, UnavailableResult } from 'src/app/interfaces/data';
import { Subscription } from 'rxjs';
import { buildPriceChartPoints, PriceChartPoint } from './price-chart';

type LoadedDayViewModel = {
  [State in DayPriceResult['state']]: {
    readonly selector: DaySelector;
    readonly state: State;
    readonly result: Extract<DayPriceResult, { state: State }>;
  }
}[DayPriceResult['state']];

export type DayViewModel = LoadedDayViewModel | {
  readonly selector: DaySelector;
  readonly state: 'loading';
  readonly result: null;
};

interface PriceSummary {
  readonly minimum: string;
  readonly maximum: string;
  readonly average: string;
  readonly bestHour: string;
}

@Component({
  selector: 'app-precios',
  templateUrl: './precios.component.html',
  styleUrls: ['./precios.component.css'],
})
export class PreciosComponent implements OnInit, OnDestroy {
  @Input() selectedDay: DaySelector = 'today';
  selectedZone: PriceZone = 'peninsular';
  readonly zones: PriceZone[] = ['peninsular', 'canarias', 'baleares', 'ceuta', 'melilla'];
  todayDay: DayViewModel = this.loadingDay('today');
  tomorrowDay: DayViewModel = this.loadingDay('tomorrow');
  // Variables
  precioZona: any; // TIpo any de momento
  fechaActual = new Date();
  fechaFormateada = this.obtenerFechaFormateada(this.fechaActual);
  cardDataArray: { title: string; date: string; price: string }[] = [];
  precioMedio:number = 0;
  precioMaximo: number = 0;
  precioMinimo: number = 0;
  private readonly daySubscriptions: Partial<Record<DaySelector, Subscription>> = {};
  private routeParamSubscription?: Subscription;
  
  constructor(private preciosService: PreciosService, @Optional() private route?: ActivatedRoute) {}

  ngOnInit() {
    this.routeParamSubscription = this.route?.paramMap.subscribe(params => {
      const selectedDay = params.get('selectedDay');
      if (selectedDay === 'today' || selectedDay === 'tomorrow') this.selectedDay = selectedDay;
    });
    this.loadDay('today');
    this.loadDay('tomorrow');
  }

  retry(selector: DaySelector): void {
    this.loadDay(selector);
  }

  changeZone(zone: PriceZone): void {
    if (this.selectedZone === zone) return;
    this.selectedZone = zone;
    this.loadDay('today');
    this.loadDay('tomorrow');
  }

  ngOnDestroy(): void {
    this.daySubscriptions.today?.unsubscribe();
    this.daySubscriptions.tomorrow?.unsubscribe();
    this.routeParamSubscription?.unsubscribe();
  }

  private loadDay(selector: DaySelector): void {
    this.daySubscriptions[selector]?.unsubscribe();
    this.setDay(selector, this.loadingDay(selector));
    this.daySubscriptions[selector] = this.preciosService.getPrecios(selector, this.selectedZone).subscribe({
      next: result => {
        const typedResult = result as unknown as DayPriceResult;
        this.setDay(selector, this.loadedDay(selector, typedResult));
      },
      error: response => {
        const failure = this.failureFrom(response, selector);
        this.setDay(selector, this.loadedDay(selector, failure));
      }
    });
  }

  private failureFrom(response: unknown, selector: DaySelector): FailureResult {
    if (typeof response === 'object' && response !== null && 'error' in response
      && this.isFailureResult(response.error)) {
      return response.error;
    }

    return {
      selector, resolvedDate: '', timeZone: 'Europe/Madrid',
      expectedIntervalCount: 0, receivedIntervalCount: 0,
      state: 'failure', values: [], retryable: true,
      error: { code: 'transport', message: 'Unable to load electricity prices.' }
    };
  }

  private isFailureResult(result: unknown): result is FailureResult {
    if (typeof result !== 'object' || result === null) return false;
    const failure = result as Partial<FailureResult>;
    return failure.state === 'failure' && (failure.selector === 'today' || failure.selector === 'tomorrow')
      && typeof failure.resolvedDate === 'string' && failure.timeZone === 'Europe/Madrid'
      && typeof failure.expectedIntervalCount === 'number' && typeof failure.receivedIntervalCount === 'number'
      && Array.isArray(failure.values) && failure.values.length === 0 && typeof failure.retryable === 'boolean'
      && typeof failure.error === 'object' && failure.error !== null
      && ['transport', 'timeout', 'provider', 'malformed_payload'].includes(failure.error.code)
      && typeof failure.error.message === 'string';
  }

  private loadingDay(selector: DaySelector): DayViewModel {
    return { selector, state: 'loading', result: null };
  }

  private loadedDay(selector: DaySelector, result: DayPriceResult): LoadedDayViewModel {
    switch (result.state) {
      case 'available':
        return { selector, state: result.state, result };
      case 'unavailable':
        return { selector, state: result.state, result };
      case 'incomplete':
        return { selector, state: result.state, result };
      case 'empty':
        return { selector, state: result.state, result };
      case 'failure':
        return { selector, state: result.state, result };
    }
  }

  private setDay(selector: DaySelector, day: DayViewModel): void {
    if (selector === 'today') {
      this.todayDay = day;
      return;
    }

    this.tomorrowDay = day;
  }

  availableResult(day: DayViewModel): AvailableResult | null {
    return day.state === 'available' ? day.result : null;
  }

  unavailableResult(day: DayViewModel): UnavailableResult | null {
    return day.state === 'unavailable' ? day.result : null;
  }

  chartPoints(result: AvailableResult): PriceChartPoint[] {
    return buildPriceChartPoints(result.values);
  }

  priceSummary(result: AvailableResult): PriceSummary {
    const points = this.chartPoints(result);
    const prices = points.map(point => point.valueEurMWh);
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const bestHour = points.find(point => point.valueEurMWh === minimum)?.label ?? '';
    return {
      minimum: this.formatPrice(minimum), maximum: this.formatPrice(maximum),
      average: this.formatPrice(average), bestHour
    };
  }

  trackPoint(_: number, point: PriceChartPoint): string {
    return point.key;
  }

  isCurrent(selector: DaySelector, point: PriceChartPoint): boolean {
    const startsAt = Date.parse(point.key);
    return selector === 'today' && startsAt <= Date.now() && Date.now() < startsAt + 60 * 60 * 1000;
  }

  minimumPrice(result: AvailableResult): number {
    const minimum = Math.min(...result.values.map(value => value.valueEurMWh));
    const maximum = Math.max(...result.values.map(value => value.valueEurMWh));
    return minimum === maximum ? Math.min(0, minimum) : minimum;
  }

  maximumPrice(result: AvailableResult): number {
    const minimum = Math.min(...result.values.map(value => value.valueEurMWh));
    const maximum = Math.max(...result.values.map(value => value.valueEurMWh));
    return minimum === maximum ? (maximum === 0 ? 1 : Math.max(0, maximum)) : maximum;
  }

  barHeight(value: number, result: AvailableResult): number {
    const minimum = this.minimumPrice(result);
    return (value - minimum) / (this.maximumPrice(result) - minimum) * 100;
  }

  private formatPrice(valueEurMWh: number): string {
    return (valueEurMWh / 1000).toLocaleString('es-ES', {
      minimumFractionDigits: 3, maximumFractionDigits: 3
    });
  }

  private obtenerFechaFormateada(fecha: Date): string {
    const opcionesDeFormato: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const fechaFormateada = fecha.toLocaleDateString('es-ES', opcionesDeFormato);  
    // Poner la primera letra del mes en mayúscula
    const partesFecha = fechaFormateada.split(' ');
    if (partesFecha.length >= 3) {
      partesFecha[2] = partesFecha[2].charAt(0).toUpperCase() + partesFecha[2].slice(1);
    }  
    return partesFecha.join(' ');
  }
  
  private configurarGrafico() {
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = 1000 - margin.left - margin.right; /* Ajusta el ancho del gráfico */
    const height = 400 - margin.top - margin.bottom; /* Ajusta el alto del gráfico */

    // Configuración del gráfico, colores, etc.
    let precios = this.precioZona.preciosHoras.map((d: Data) => d.precio);
    let minPrecio = d3.min(precios);
    let maxPrecio = d3.max(precios);
    let color: d3.ScaleLinear<string, string> = d3
      .scaleLinear<string>()
      .range(['green', 'yellow', 'red']);

    if (typeof minPrecio === 'number' && typeof maxPrecio === 'number') {
      let avgPrecio = (minPrecio + maxPrecio) / 2;
      color.domain([minPrecio, avgPrecio, maxPrecio]);
    }

    return {
      margin,
      width,
      height,
      color,
    };
  }

  private crearSVG() {
    const { margin, width, height } = this.configurarGrafico();
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr(
        'viewBox',
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    return svg;
  }

  private escalarDatos() {
    const { width, height, color } = this.configurarGrafico();
    const horas = this.precioZona.preciosHoras.map((d: Data, i: number) => {
      const fecha = new Date(d.datetime);
      const hora = fecha.getHours().toString().padStart(2, '0');    
      return hora;
    });
    const x = d3.scaleBand().range([0, width]).padding(0.3);
    const y = d3.scaleLinear().range([height, 0]);

    x.domain(horas);
    let preciosHorasConPrecio: number[] = this.precioZona.preciosHoras.map(
      (d: Data) => d.precio
    );
    y.domain([0, d3.max(preciosHorasConPrecio) || 0]);

    return { x, y, color };
  }

  private agregarEjes(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    x: d3.ScaleBand<string>,
    y: d3.ScaleLinear<number, number>
  ) {
    const { height } = this.configurarGrafico();
    // Añadir el eje X
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));
    // Añadir el eje Y
    svg
      .append('g')
      .call(d3.axisLeft(y))
      .selectAll('.tick text') // Seleccionar todas las etiquetas de ticks en el eje Y
      .text((d: any) => (d / 1000).toFixed(2)); // Convertir de €/MWh a €/kWh
  }

  private agregarEtiquetas(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  ) {
    // Añadir etiqueta al eje X
    const { height } = this.configurarGrafico();
    const { width } = this.configurarGrafico();
    const { margin } = this.configurarGrafico();
    svg
      .append('text')
      .attr('transform', `translate(${width / 2},${height + margin.bottom + 10})`)
      .style('text-anchor', 'middle')
      // .style('fill', 'white')
      .style('font-weight', 'bold')
      .text('Horas');

    // Añadir etiqueta al eje Y
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 9)
      .attr('x', 0 - height / 2)
      .attr('dy', '0.8em')
      .style('text-anchor', 'middle')
      // .style('fill', 'white')
      .style('font-weight', 'bold')
      .text('€/kWh');
  }

  private agregarPuntos(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    x: d3.ScaleBand<string>,
    y: d3.ScaleLinear<number, number>
  ) {
    // Añadir los puntos
    svg
      .selectAll('.dot')
      .data<Data>(this.precioZona.preciosHoras)
      .enter()
      .append('g')
      .attr('class', 'dot-group')
      .attr(
        'transform',
        (d: Data) =>
          `translate(${
            (x(new Date(d.datetime).getHours().toString().padStart(2, '0')) || 0) +
            x.bandwidth() / 2
          },${y(d.precio)})`
      )
      .append('circle')
      .attr('class', 'dot')
      .attr('r', 5)
      .attr('fill', 'black');

    // Añadir el texto
    svg
      .selectAll('.dot-group')
      .data<Data>(this.precioZona.preciosHoras)
      .append('text')
      .attr('class', 'label')
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      // .style('fill', '#B1B1B2')
      .text((d: Data) => (d.precio / 1000).toFixed(3));
  }

  private agregarBarras(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    x: d3.ScaleBand<string>,
    y: d3.ScaleLinear<number, number>,
    color: d3.ScaleLinear<string, string>
  ) {
    const { height } = this.configurarGrafico();
    // Añadir las barras
    svg
      .selectAll('.bar')
      .data<Data>(this.precioZona.preciosHoras)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr(
        'x',
        (d: Data) => x(new Date(d.datetime).getHours().toString().padStart(2, '0')) || 0
      )
      .attr('width', x.bandwidth())
      .attr('y', (d: Data) => y(d.precio))
      .attr('height', (d: Data) => height - y(d.precio))
      .attr('fill', (d: Data) => color(d.precio))
      .attr('rx', 20);
  }

  private agregarLineaMedia(
    svg: d3.Selection<SVGGElement, 
    unknown, HTMLElement, any>, 
    x: d3.ScaleBand<string>, 
    y: d3.ScaleLinear<number, number>) {
    const { width } = this.configurarGrafico();
    //Calculo la media de precios
    const precios = this.precioZona.preciosHoras.map((d: Data) => d.precio);
    const mediaPrecio = d3.mean(precios) || 0;
    this.precioMaximo = Math.round((d3.max(precios as number[]) || 0) as number)/1000;
    this.precioMinimo = (Math.ceil(d3.min(precios as number[]) || 0) as number)/1000;
    this.precioMedio = Math.round((mediaPrecio/1000) * 1000 ) / 1000; // Redondeo a tres decimales
    // Añadir línea de la media
    svg
      .data<Data>(this.precioZona.preciosHoras)
      .append('line')
      .attr('class', 'media-line')
      .attr('x1', 0)
      .attr('y1', y(mediaPrecio))
      .attr('x2', width)
      .attr('y2', y(mediaPrecio))
      .attr('stroke', 'purple')
      .attr('stroke-width', 2);

    // svg
    //   .append('text')
    //   .attr('class', 'media-text')
    //   .attr('x', width - 40)
    //   .attr('y', y(mediaPrecio) - 10)
    //   // .style('fill', 'white')
    //   .text('Media');
  }

  private resaltarBarraActual(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    x: d3.ScaleBand<string>,
    y: d3.ScaleLinear<number, number>
  ) {
    const ahora = new Date();
    const horaActual = ahora.getHours().toString().padStart(2, '0');; // Obtén solo la hora del formato ISO
    const { height } = this.configurarGrafico();
    // Obtener la altura de la barra correspondiente a la hora actual
    const alturaBarra = height - y(this.precioZona.preciosHoras.find((d: Data) => d.datetime.slice(11, 13) === horaActual)?.precio || 0);
    
    // Añadir un marco a la barra correspondiente a la hora actual
    svg
      .append('rect')
      .attr('class', 'barra-actual bar') // Usa ambas clases para compartir estilos
      .attr('x', x(horaActual) || 0)
      .attr('width', x.bandwidth())
      .attr('y', y(this.precioZona.preciosHoras.find((d: Data) => d.datetime.slice(11, 13) === horaActual)?.precio || 0))
      .attr('height', alturaBarra)
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 3)
      .attr('rx', 20);
  }

  private crearGrafico() {
    const svg = this.crearSVG();
    const { x, y, color } = this.escalarDatos();

    this.agregarBarras(svg, x, y, color);
    this.agregarPuntos(svg, x, y);
    this.agregarLineaMedia(svg, x, y);
    this.resaltarBarraActual(svg, x, y);
    this.agregarEjes(svg, x, y);
    this.agregarEtiquetas(svg);
  }

}
