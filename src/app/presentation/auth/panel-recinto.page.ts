import { Component, inject, signal, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import {
  listarJuntas,
  listarRecintos,
  type Junta,
  type Recinto,
} from '../../core/infrastructure/recintos.repository';
import { AsignarJuntasComponent } from './asignar-juntas.component';
import { CrearCoordinadorComponent } from './crear-coordinador.component';

@Component({
  standalone: true,
  imports: [
    IonContent,
    CrearCoordinadorComponent,
    AsignarJuntasComponent,
  ],
  template: `
    <ion-content class="ion-padding">
      <h1>Panel de recinto</h1>

      @if (cargando()) {
        <p role="status">Cargando datos del recinto…</p>
      } @else if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else {
        <app-crear-coordinador
          [recintos]="recintos()"
          tipo="veedor"
        ></app-crear-coordinador>

        <app-asignar-juntas></app-asignar-juntas>

        <h2>Juntas de mi recinto</h2>
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

  readonly recintos = signal<Recinto[]>([]);
  readonly juntas = signal<Junta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  @ViewChild(AsignarJuntasComponent)
  set asignaciones(componente: AsignarJuntasComponent | undefined) {
    if (componente) {
      queueMicrotask(() => {
        void componente.cargar();
      });
    }
  }

  async ionViewWillEnter(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.recintos.set([]);
    this.juntas.set([]);

    try {
      const recintoId = this.auth.perfil()?.recinto_id;

      if (!recintoId) {
        throw new Error('Tu cuenta no tiene un recinto asignado.');
      }

      const [recintos, juntas] = await Promise.all([
        listarRecintos(),
        listarJuntas(recintoId),
      ]);

      const recintoAsignado = recintos.find(
        (recinto) => recinto.id === recintoId,
      );

      if (!recintoAsignado) {
        throw new Error(
          'No se pudo leer tu recinto asignado. Revisa los permisos en Supabase.',
        );
      }

      this.recintos.set([recintoAsignado]);
      this.juntas.set(juntas);
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los datos del recinto.',
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
