import { Component, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import { listarJuntas, type Junta } from '../../core/infrastructure/recintos.repository';

@Component({
  standalone: true,
  imports: [IonContent],
  template: `
    <ion-content class="ion-padding">
      <h1>Panel de recinto</h1>
      <h2>Juntas de mi recinto</h2>

      @if (cargando()) {
        <p role="status">Cargando juntas…</p>
      } @else if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else {
        <ul>
          @for (junta of juntas(); track junta.id) {
            <li>Junta {{ junta.numero }}</li>
          } @empty {
            <li>Este recinto todavía no tiene juntas.</li>
          }
        </ul>
      }
    </ion-content>
  `,
})
export class PanelRecintoPage {
  private readonly auth = inject(AuthService);

  readonly juntas = signal<Junta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  async ionViewWillEnter(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const recintoId = this.auth.perfil()?.recinto_id;

      if (!recintoId) {
        throw new Error('Tu cuenta no tiene un recinto asignado.');
      }

      this.juntas.set(await listarJuntas(recintoId));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las juntas.');
    } finally {
      this.cargando.set(false);
    }
  }
}