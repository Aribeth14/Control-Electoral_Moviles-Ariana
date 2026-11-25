import { Component, inject, signal, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import {
  consultarDetalleActaRecinto,
  consultarEstadoActasRecinto,
  obtenerUrlFotoActa,
  type DetalleActaRecinto,
  type EstadoActasJunta,
} from '../../core/infrastructure/actas.repository';
import type { Dignidad } from '../../core/infrastructure/candidaturas.repository';
import {
  listarRecintos,
  type Recinto,
} from '../../core/infrastructure/recintos.repository';
import { AsignarJuntasComponent } from './asignar-juntas.component';
import { CorregirActaComponent } from './corregir-acta.component';
import { CrearCoordinadorComponent } from './crear-coordinador.component';

@Component({
  standalone: true,
  imports: [
    IonContent,
    CrearCoordinadorComponent,
    AsignarJuntasComponent,
    CorregirActaComponent,
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

        @if (cargandoDetalle()) {
          <p role="status">Cargando acta…</p>
        }

        @if (mensajeDetalle()) {
          <p role="status">{{ mensajeDetalle() }}</p>
        }

        @if (errorDetalle()) {
          <p role="alert">{{ errorDetalle() }}</p>
        }

        <ul>
          @for (estado of estadosActas(); track estado.numero) {
            <li>
              <strong>Junta {{ estado.numero }}</strong>

              <p>
                Alcaldía:
                {{ estado.alcaldia_reportada ? 'Reportada' : 'Pendiente' }}

                @if (estado.alcaldia_reportada) {
                  <button
                    type="button"
                    [disabled]="cargandoDetalle() || editandoActa()"
                    (click)="verActa(estado.numero, 'alcaldia')"
                  >
                    Ver acta de Alcaldía
                  </button>
                }
              </p>

              <p>
                Prefectura:
                {{ estado.prefectura_reportada ? 'Reportada' : 'Pendiente' }}

                @if (estado.prefectura_reportada) {
                  <button
                    type="button"
                    [disabled]="cargandoDetalle() || editandoActa()"
                    (click)="verActa(estado.numero, 'prefectura')"
                  >
                    Ver acta de Prefectura
                  </button>
                }
              </p>

              @if (detalleActa(); as acta) {
                @if (acta.numero === estado.numero) {
                  <section>
                    <h3>
                      Acta de
                      {{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}
                    </h3>

                    <ul>
                      @for (voto of acta.votos; track voto.candidatura_id) {
                        <li>{{ voto.nombre }}: {{ voto.votos }} votos</li>
                      }
                    </ul>

                    <p>Blancos: {{ acta.blancos }} · Nulos: {{ acta.nulos }}</p>
                    <p>Total de sufragantes: {{ acta.sufragantes }}</p>
                    <p>{{ acta.tiene_foto ? 'Foto guardada' : 'Sin foto registrada' }}</p>

                    @if (acta.foto_ruta) {
                      <button
                        type="button"
                        [disabled]="cargandoFoto()"
                        (click)="verFoto(acta)"
                      >
                        {{ cargandoFoto() ? 'Abriendo foto…' : 'Ver foto del acta' }}
                      </button>

                      @if (urlFoto(); as url) {
                        <p>
                          <img
                            [src]="url"
                            alt="Foto del acta electoral"
                            width="300"
                            style="max-width: 100%; height: auto"
                            (error)="mostrarErrorImagen(url)"
                          />
                        </p>
                      }

                      @if (errorFoto()) {
                        <p role="alert">{{ errorFoto() }}</p>
                      }
                    }

                    @if (acta.gps_latitud !== null && acta.gps_longitud !== null) {
                      <p>GPS: {{ acta.gps_latitud }}, {{ acta.gps_longitud }}</p>
                    } @else {
                      <p>Sin ubicación registrada.</p>
                    }

                    @if (editandoActa()) {
                      <app-corregir-acta
                        [acta]="acta"
                        (guardada)="actualizarActaCorregida(acta)"
                        (cancelada)="editandoActa.set(false)"
                      ></app-corregir-acta>
                    } @else {
                      <button type="button" (click)="iniciarCorreccion()">
                        Corregir acta
                      </button>

                      <button type="button" (click)="cerrarDetalle()">
                        Cerrar detalle
                      </button>
                    }
                  </section>
                }
              }
            </li>
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
  private versionVista = 0;

  readonly recintos = signal<Recinto[]>([]);
  readonly estadosActas = signal<EstadoActasJunta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly detalleActa = signal<DetalleActaRecinto | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal('');
  readonly mensajeDetalle = signal('');
  readonly editandoActa = signal(false);

  readonly urlFoto = signal<string | null>(null);
  readonly cargandoFoto = signal(false);
  readonly errorFoto = signal('');

  @ViewChild(AsignarJuntasComponent)
  set asignaciones(componente: AsignarJuntasComponent | undefined) {
    if (componente) {
      queueMicrotask(() => {
        void componente.cargar();
      });
    }
  }

  async ionViewWillEnter(): Promise<void> {
    const version = ++this.versionVista;

    this.cargando.set(true);
    this.error.set('');
    this.recintos.set([]);
    this.estadosActas.set([]);
    this.cerrarDetalle();
    this.cargandoDetalle.set(false);

    try {
      const recintoId = this.auth.perfil()?.recinto_id;

      if (!recintoId) {
        throw new Error('Tu cuenta no tiene un recinto asignado.');
      }

      const [recintos, estadosActas] = await Promise.all([
        listarRecintos(),
        consultarEstadoActasRecinto(),
      ]);

      if (version !== this.versionVista) return;

      const recintoAsignado = recintos.find((recinto) => recinto.id === recintoId);

      if (!recintoAsignado) {
        throw new Error('No se pudo leer tu recinto asignado. Revisa los permisos en Supabase.');
      }

      this.recintos.set([recintoAsignado]);
      this.estadosActas.set(estadosActas);
    } catch (error) {
      if (version === this.versionVista) {
        this.error.set(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los datos del recinto.',
        );
      }
    } finally {
      if (version === this.versionVista) {
        this.cargando.set(false);
      }
    }
  }

  async verActa(numero: number, dignidad: Dignidad): Promise<void> {
    if (this.cargandoDetalle() || this.editandoActa()) return;

    const version = this.versionVista;

    this.cerrarDetalle();
    this.cargandoDetalle.set(true);

    try {
      const acta = await consultarDetalleActaRecinto(numero, dignidad);

      if (version === this.versionVista) {
        this.detalleActa.set(acta);
      }
    } catch (error) {
      if (version === this.versionVista) {
        this.errorDetalle.set(
          error instanceof Error ? error.message : 'No se pudo consultar el acta.',
        );
      }
    } finally {
      if (version === this.versionVista) {
        this.cargandoDetalle.set(false);
      }
    }
  }

  iniciarCorreccion(): void {
    this.mensajeDetalle.set('');
    this.editandoActa.set(true);
  }

  async actualizarActaCorregida(acta: DetalleActaRecinto): Promise<void> {
    if (this.detalleActa() !== acta) return;

    const version = this.versionVista;

    this.editandoActa.set(false);
    await this.verActa(acta.numero, acta.dignidad);

    if (version === this.versionVista) {
      this.mensajeDetalle.set('Corrección guardada correctamente.');
    }
  }

  async verFoto(acta: DetalleActaRecinto): Promise<void> {
    if (!acta.foto_ruta || this.cargandoFoto() || this.detalleActa() !== acta) {
      return;
    }

    this.urlFoto.set(null);
    this.errorFoto.set('');
    this.cargandoFoto.set(true);

    try {
      const url = await obtenerUrlFotoActa(acta.foto_ruta);

      if (this.detalleActa() === acta) {
        this.urlFoto.set(url);
      }
    } catch (error) {
      if (this.detalleActa() === acta) {
        this.errorFoto.set(
          error instanceof Error ? error.message : 'No se pudo abrir la foto.',
        );
      }
    } finally {
      if (this.detalleActa() === acta) {
        this.cargandoFoto.set(false);
      }
    }
  }

  mostrarErrorImagen(url: string): void {
    if (this.urlFoto() !== url) return;

    this.urlFoto.set(null);
    this.errorFoto.set('No se pudo cargar la imagen. Pulsa Ver foto del acta para reintentar.');
  }

  cerrarDetalle(): void {
    this.editandoActa.set(false);
    this.detalleActa.set(null);
    this.errorDetalle.set('');
    this.mensajeDetalle.set('');
    this.urlFoto.set(null);
    this.cargandoFoto.set(false);
    this.errorFoto.set('');
  }
}
