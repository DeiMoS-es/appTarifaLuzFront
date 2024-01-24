import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PreciosComponent } from './components/energia/precios/precios.component';

const routes: Routes = [
  { path: '', redirectTo: '/precios', pathMatch: 'full' },
  {path:'precios', component: PreciosComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
