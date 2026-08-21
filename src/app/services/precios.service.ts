import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DayPriceResult, DaySelector, LegacyPriceResponse } from '../interfaces/data';

@Injectable({
  providedIn: 'root'
})
export class PreciosService {
  private readonly baseUrl = 'https://app-tarifa-luz-back.vercel.app/api/precios';
  // Local development: http://localhost:3000/api/precios


  constructor(private httpClient: HttpClient) { }

  public getPrecios(): Observable<LegacyPriceResponse>;
  public getPrecios(selector: DaySelector): Observable<DayPriceResult>;
  public getPrecios(selector?: DaySelector): Observable<LegacyPriceResponse | DayPriceResult> {
    if (!selector) {
      return this.httpClient.get<LegacyPriceResponse>(this.baseUrl);
    }

    return this.httpClient.get<DayPriceResult>(this.baseUrl, {
      params: { day: selector }
    });
  }
}
