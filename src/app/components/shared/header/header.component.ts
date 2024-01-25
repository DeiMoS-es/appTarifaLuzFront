import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit{

  // Cuando se usa ViewChild, las propiedades de inicializan después del contructor, en el ciclo de vida de ngAfterViewInit.
  // Por eso le añado el !, para indicar que esa propiedad se inicializará de manera segura en algún momento
  @ViewChild('hamburgerButton') hamburgerButton!: ElementRef;
  @ViewChild('navBar') navBar!: ElementRef;

  ngAfterViewInit() {
    this.hamburgerButton.nativeElement.addEventListener('click', () => {
      if (this.navBar.nativeElement.style.display === 'none' || this.navBar.nativeElement.style.display === '') {
        this.navBar.nativeElement.classList.add('mobile-nav');
        this.navBar.nativeElement.style.display = 'flex';
      } else {
        this.navBar.nativeElement.classList.remove('mobile-nav');
        this.navBar.nativeElement.style.display = 'none';
      }
    });
  }

}
