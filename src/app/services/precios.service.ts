import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PreciosService {

  // baseUrl = 'http://localhost:3000/api/precios';
  baseUrlVercel = 'https://appluzback-rf305eznq-deimoss-projects.vercel.app/api/precios';

  constructor(private httpClient: HttpClient) { }


  public getPrecios(){
    return this.httpClient.get<any>(`${this.baseUrlVercel}`);
  }
}
