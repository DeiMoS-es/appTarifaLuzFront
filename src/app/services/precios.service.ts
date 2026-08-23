import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DayPriceResult, DaySelector, LegacyPriceResponse, PriceZone } from '../interfaces/data';

@Injectable({
  providedIn: 'root'
})
export class PreciosService {
  private readonly apiBase = this.getApiBase();

  private getApiBase(): string {
    try {
      const host = window && (window.location && window.location.hostname) ? window.location.hostname : '';
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
      return isLocal
        ? 'http://localhost:3000/api'
        : 'https://app-tarifa-luz-back.vercel.app/api';
    } catch {
      return 'https://app-tarifa-luz-back.vercel.app/api';
    }
  }

  constructor(private httpClient: HttpClient) { }

  public getPrecios(): Observable<LegacyPriceResponse>;
  public getPrecios(selector: DaySelector, zone?: PriceZone): Observable<DayPriceResult>;
  public getPrecios(selector?: DaySelector, zone: PriceZone = 'peninsular'): Observable<LegacyPriceResponse | DayPriceResult> {
    const url = `${this.apiBase}/precios`;
    const isDaySelector = selector === 'today' || selector === 'tomorrow';

    if (!selector || !isDaySelector) {
      return this.httpClient.get<LegacyPriceResponse>(url, { params: { zone } });
    }

    return this.httpClient.get<DayPriceResult>(url, {
      params: { day: selector, zone }
    });
  }
}
