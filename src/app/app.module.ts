import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PreciosComponent } from './components/energia/precios/precios.component';
import { HeaderComponent } from './components/shared/header/header.component';
import { BottomNavigationComponent } from './components/shared/bottom-navigation/bottom-navigation.component';
import { CardsComponent } from './components/energia/cards/cards.component';
import { TodayPriceComponent } from './components/energia/precios/today-price.component';


@NgModule({
  declarations: [
    AppComponent,
    PreciosComponent,
    CardsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    HeaderComponent,
    BottomNavigationComponent,
    TodayPriceComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
