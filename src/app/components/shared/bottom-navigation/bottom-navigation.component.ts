import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './bottom-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomNavigationComponent {}
