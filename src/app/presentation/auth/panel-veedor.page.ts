import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import {
  consultarDetalleActaRecinto,
  type DetalleActaRecinto,
} from '../../core/infrastructure/actas.repository';
import {
  consultarAsignaciones,
  type JuntaAsignable,
} from '../../core/infrastructure/asignaciones.repository';
import type { Dignidad } from '../../core/infrastructure/candidaturas.repository';
import { CorregirActaComponent } from './corregir-acta.component';
import { RegistrarActaComponent } from './registrar-acta.component';

@Component({
  standalone: true,
  imports: [
    IonButton,
    IonContent,
    RegistrarActaComponent,
    CorregirActaComponent,
  ],
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
                <strong>Junta {{ junta.numero }}</strong>

                @if (actaParaCorregir(); as acta) {
                  @if (acta.numero === junta.numero) {
                    <h3>
                      {{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}
                    </h3>

                    <app-corregir-acta
                      [acta]="acta"
                      (guardada)="finalizarCorreccion()"
                      (cancelada)="actaParaCorregir.set(null)"
                    ></app-corregir-acta>
                  }
                } @else if (juntaSeleccionada() === junta.numero) {
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
                    [disabled]="consultandoActa()"
                    (click)="juntaSeleccionada.set(junta.numero)"
                  >
                    Registrar acta
                  </ion-button>

                  <ion-button
                    type="button"
                    fill="outline"
                    [disabled]="consultandoActa()"
                    (click)="abrirCorreccion(junta.numero, 'alcaldia')"
                  >
                    Corregir Alcaldía
                  </ion-button>

                  <ion-button
                    type="button"
                    fill="outline"
                    [disabled]="consultandoActa()"
                    (click)="abrirCorreccion(junta.numero, 'prefectura')"
                  >
                    Corregir Prefectura
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

      @if (consultandoActa()) {
        <p role="status">Consultando acta…</p>
      }

      @if (errorCorreccion()) {
        <p role="alert">{{ errorCorreccion() }}</p>
      }

      @if (mensajeCorreccion()) {
        <p role="status">{{ mensajeCorreccion() }}</p>
      }

      <ion-button
        type="button"
        [disabled]="cargando() || correccionEnCurso()"
        (click)="cargar()"
      >
        Actualizar
      </ion-button>

      <ion-button
        type="button"
        fill="outline"
        [disabled]="cargando() || correccionEnCurso()"
        (click)="salir()"
      >
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

  readonly actaParaCorregir = signal<DetalleActaRecinto | null>(null);
  readonly consultandoActa = signal(false);
  readonly errorCorreccion = signal('');
  readonly mensajeCorreccion = signal('');

  readonly correccionEnCurso = computed(
    () => this.consultandoActa() || this.actaParaCorregir() !== null,
  );

  ionViewWillEnter(): Promise<void> {
    return this.cargar();
  }

  async cargar(): Promise<void> {
    if (this.correccionEnCurso()) return;

    this.juntaSeleccionada.set(null);
    this.errorCorreccion.set('');
    this.mensajeCorreccion.set('');
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

  async abrirCorreccion(numero: number, dignidad: Dignidad): Promise<void> {
    if (this.cargando() || this.correccionEnCurso()) return;

    this.juntaSeleccionada.set(null);
    this.errorCorreccion.set('');
    this.mensajeCorreccion.set('');
    this.consultandoActa.set(true);

    try {
      const acta = await consultarDetalleActaRecinto(numero, dignidad);
      this.actaParaCorregir.set(acta);
    } catch (error) {
      this.errorCorreccion.set(
        error instanceof Error ? error.message : 'No se pudo abrir el acta.',
      );
    } finally {
      this.consultandoActa.set(false);
    }
  }

  finalizarCorreccion(): void {
    this.actaParaCorregir.set(null);
    this.mensajeCorreccion.set('Corrección guardada.');
  }

  async salir(): Promise<void> {
    if (this.cargando() || this.correccionEnCurso()) return;

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
