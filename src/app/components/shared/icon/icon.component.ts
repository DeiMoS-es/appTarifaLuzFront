import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName = 'zap' | 'settings' | 'user' | 'calendar-days' | 'calendar-clock' | 'history';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"
         stroke-linejoin="round" stroke-width="2" aria-hidden="true" focusable="false">
      <ng-container [ngSwitch]="name">
        <path *ngSwitchCase="'zap'" d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z"/>
        <ng-container *ngSwitchCase="'settings'">
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0a2.34 2.34 0 0 0 3.319 1.915a2.34 2.34 0 0 1 2.33 4.033a2.34 2.34 0 0 0 0 3.831a2.34 2.34 0 0 1-2.33 4.033a2.34 2.34 0 0 0-3.319 1.915a2.34 2.34 0 0 1-4.659 0a2.34 2.34 0 0 0-3.32-1.915a2.34 2.34 0 0 1-2.33-4.033a2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
          <circle cx="12" cy="12" r="3"/>
        </ng-container>
        <ng-container *ngSwitchCase="'user'">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </ng-container>
        <ng-container *ngSwitchCase="'calendar-days'">
          <path d="M8 2v3m8-3v3"/><rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/>
        </ng-container>
        <ng-container *ngSwitchCase="'calendar-clock'">
          <path d="M16 14v2.2l1.6 1M16 2v3m5 2.338V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2.338M3 9h5.859M8 2v3"/>
          <circle cx="16" cy="16" r="6"/>
        </ng-container>
        <ng-container *ngSwitchCase="'history'">
          <path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5m4-1v5l4 2"/>
        </ng-container>
      </ng-container>
    </svg>
  `,
  styles: [':host { display: inline-flex; }', 'svg { width: 100%; height: 100%; }']
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
}
