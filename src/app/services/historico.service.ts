import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoricoResponse } from '../interfaces/data';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
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

  constructor(private http: HttpClient) {}

  getSemana(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.apiBase}/historico/semana`);
  }

  getMes(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.apiBase}/historico/mes`);
  }

  getAnio(): Observable<HistoricoResponse> {
    return this.http.get<HistoricoResponse>(`${this.apiBase}/historico/anio`);
  }

  // Get the 7 days for a given week start YYYY-MM-DD
  getWeek(start: string): Observable<HistoricoResponse & { start: string } > {
    return this.http.get<HistoricoResponse & { start: string }>(`${this.apiBase}/historico/week`, { params: { start } });
  }
}
