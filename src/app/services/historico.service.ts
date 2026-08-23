import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoricoResponse } from '../interfaces/data';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  // Base URL: localhost for local development, exact Vercel backend URL for production.
  private get baseUrl(): string {
    try {
      const host = window && (window.location && window.location.hostname) ? window.location.hostname : '';
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
      return isLocal
        ? 'http://localhost:3000/api/historico'
        : 'https://app-tarifa-luz-back.vercel.app/api/historico';
    } catch {
      return 'https://app-tarifa-luz-back.vercel.app/api/historico';
    }
  }

  constructor(private http: HttpClient) {}

  getSemana(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.baseUrl}/semana`);
  }

  getMes(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.baseUrl}/mes`);
  }

  getAnio(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.baseUrl}/anio`);
  }

  // Get the 7 days for a given week start YYYY-MM-DD
  getWeek(start: string): Observable<HistoricoResponse & { start: string } > {
    return this.http.get<HistoricoResponse & { start: string }>(`${this.baseUrl}/week`, { params: { start } });
  }
}
