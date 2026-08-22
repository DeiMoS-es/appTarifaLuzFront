import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { UnavailableResult } from '../../../interfaces/data';

@Component({
  selector: 'app-tomorrow-unavailable', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="grid gap-4"><div class="flex items-center gap-4 rounded-[18px] bg-slate-200 px-5 py-4" role="status"><span class="grid h-11 w-11 flex-none place-items-center rounded-full bg-white text-2xl" aria-hidden="true">⌛</span><p class="m-0 flex-1 leading-snug"><strong>Precios de mañana</strong><br>{{ publicationCopy }}</p><button type="button" class="rounded-xl border-0 bg-slate-300 px-4 py-3 font-semibold text-slate-500" data-notify aria-describedby="notify-help" title="Avisos próximamente" disabled (click)="requestNotification()">♧ Avisarme</button></div><p id="notify-help" class="m-0 text-sm text-slate-600">Los avisos estarán disponibles próximamente; no se ha programado ninguna notificación.</p><button type="button" class="justify-self-start rounded-xl border-0 bg-[#073f78] px-4 py-3 font-semibold text-white" data-retry (click)="retryRequested.emit()">Reintentar</button></div>`
})
export class TomorrowUnavailableComponent {
  @Input({ required: true }) result!: UnavailableResult;
  @Output() notifyRequested = new EventEmitter<void>();
  @Output() retryRequested = new EventEmitter<void>();
  get publicationCopy(): string {
    return this.result.reason === 'before_publication' ? 'Disponibles a las 20:15' : 'El proveedor aún no los ha publicado';
  }
  requestNotification(): void { this.notifyRequested.emit(); }
}
