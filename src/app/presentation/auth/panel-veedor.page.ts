import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import {
  consultarAsignaciones,
  type JuntaAsignable,
} from '../../core/infrastructure/asignaciones.repository';
import { RegistrarActaComponent } from './registrar-acta.component';

@Component({
  standalone: true,
  imports: [IonButton, IonContent, RegistrarActaComponent],
  template: `
    <ion-content class="ion-padding">
      <h1>Panel del veedor</h1>
      <h2>Mis juntas</h2>

      @if (cargando()) {
        <p role="status">Cargando juntas…</p>
      } @else if (!error()) {
        @if (juntas().length > 0) {
          <ul>
            @for (junta of juntas(); track junta.numero) {
              <li>
                Junta {{ junta.numero }}

                @if (juntaSeleccionada() === junta.numero) {
                  <ion-button
                    type="button"
                    fill="outline"
                    (click)="juntaSeleccionada.set(null)"
                  >
                    Cerrar formulario
                  </ion-button>

                  <app-registrar-acta
                    [numeroJunta]="junta.numero"
                  ></app-registrar-acta>
                } @else {
                  <ion-button
                    type="button"
                    (click)="juntaSeleccionada.set(junta.numero)"
                  >
                    Registrar acta
                  </ion-button>
                }
              </li>
            }
          </ul>
        } @else {
          <p>Todavía no tienes juntas asignadas.</p>
        }
      }

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      <ion-button type="button" [disabled]="cargando()" (click)="cargar()">
        Actualizar
      </ion-button>

      <ion-button type="button" fill="outline" (click)="salir()">
        Cerrar sesión
      </ion-button>
    </ion-content>
  `,
})
export class PanelVeedorPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly juntas = signal<JuntaAsignable[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly juntaSeleccionada = signal<number | null>(null);

  ionViewWillEnter(): Promise<void> {
    return this.cargar();
  }

  async cargar(): Promise<void> {
    this.juntaSeleccionada.set(null);
    this.cargando.set(true);
    this.error.set('');
    this.juntas.set([]);

    try {
      const resultado = await consultarAsignaciones();
      this.juntas.set(resultado.juntas);
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar tus juntas.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async salir(): Promise<void> {
    try {
      await this.auth.salir();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar la sesión.',
      );
    }
  }
}
