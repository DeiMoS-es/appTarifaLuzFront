import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoricoResponse } from '../interfaces/data';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  // Usar entorno local durante el desarrollo
  private readonly baseUrl = 'http://localhost:3000/api/historico';

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
