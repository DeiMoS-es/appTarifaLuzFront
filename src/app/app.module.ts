import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PreciosComponent } from './components/energia/precios/precios.component';
import { HeaderComponent } from './components/shared/header/header.component';
import { BottomNavigationComponent } from './components/shared/bottom-navigation/bottom-navigation.component';
import { CardsComponent } from './components/energia/cards/cards.component';
import { TodayPriceComponent } from './components/energia/precios/today-price.component';
import { TomorrowPriceComponent } from './components/energia/precios/tomorrow-price.component';
import { TomorrowUnavailableComponent } from './components/energia/precios/tomorrow-unavailable.component';
import { HistoricoComponent } from './components/energia/historico.component';

@NgModule({
  declarations: [
    AppComponent,
    PreciosComponent,
    CardsComponent,
    HistoricoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    // These components are standalone — import them instead of declaring
    TodayPriceComponent,
    TomorrowPriceComponent,
    TomorrowUnavailableComponent,
    HeaderComponent,
    BottomNavigationComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
