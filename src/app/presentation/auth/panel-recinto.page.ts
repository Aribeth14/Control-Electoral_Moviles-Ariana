import { PanelHeaderComponent } from './panel-header.component';
import { PanelModalComponent } from './panel-modal.component';
import { PanelPagerComponent, FILAS_POR_PAGINA } from './panel-pager.component';
import { Component, computed, inject, signal, viewChild, ViewChild } from '@angular/core';
import {
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonBadge,
  IonSearchbar,
} from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';
import {
  consultarDetalleActaRecinto,
  consultarEstadoActasRecinto,
  obtenerUrlFotoActa,
  type DetalleActaRecinto,
  type EstadoActasJunta,
} from '../../core/infrastructure/actas.repository';
import type { Dignidad } from '../../core/infrastructure/candidaturas.repository';
import { listarRecintos, type Recinto } from '../../core/infrastructure/recintos.repository';
import { AsignarJuntasComponent } from './asignar-juntas.component';
import { CorregirActaComponent } from './corregir-acta.component';
import { CrearCoordinadorComponent } from './crear-coordinador.component';

@Component({
  standalone: true,
  imports: [
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonBadge,
    IonSearchbar,
    PanelHeaderComponent,
    PanelModalComponent,
    PanelPagerComponent,
    IonContent,
    CrearCoordinadorComponent,
    AsignarJuntasComponent,
    CorregirActaComponent,
  ],
  template: `
    <app-panel-header [titulo]="recintos()[0]?.nombre ?? 'Coordinador de recinto'"></app-panel-header>
    <ion-segment class="ce-segments" [value]="seccion()" (ionChange)="cambiarSeccion($event.detail.value)">
      <ion-segment-button value="juntas">Juntas</ion-segment-button>
      <ion-segment-button value="asignaciones">Asignaciones</ion-segment-button>
      <ion-segment-button value="veedores">Veedores</ion-segment-button>
    </ion-segment>
    <ion-content class="ce-panel">
      <main class="ce-main ce-compact">
        @if (cargando()) {
          <p role="status">Cargando datos del recinto…</p>
        } @else if (error()) {
          <p role="alert">{{ error() }}</p>
          <ion-button fill="outline" (click)="ionViewWillEnter()">Reintentar</ion-button>
        } @else {
          @switch (seccion()) {
            @case ('juntas') {
              <div class="ce-filters">
                <ion-searchbar
                  placeholder="Buscar número de junta"
                  aria-label="Buscar junta"
                  inputmode="numeric"
                  [value]="busqueda()"
                  (ionInput)="buscar($event.detail.value ?? '')"
                ></ion-searchbar>
              </div>
              <ion-list class="ce-rows" aria-label="Juntas de mi recinto">
                @for (
                  estado of juntasFiltradas().slice(
                    pagina() * filasPorPagina,
                    pagina() * filasPorPagina + filasPorPagina
                  );
                  track estado.numero
                ) {
                  <ion-item class="ce-junta-item">
                    <strong class="ce-junta" slot="start"><small>Junta</small>{{ estado.numero }}</strong>
                    <div class="ce-state-group">
                      @for (d of dignidades; track d.id) {
                        @let reportada = d.id === 'alcaldia' ? estado.alcaldia_reportada : estado.prefectura_reportada;
                        @if (reportada) {
                          <button
                            type="button"
                            class="ce-state-row ce-state-action"
                            (click)="abrirDetalle(estado.numero, d.id)"
                          >
                            <span>{{ d.nombre }}</span><ion-badge class="ce-reported">Reportada</ion-badge>
                          </button>
                        } @else {
                          <div class="ce-state-row">
                            <span>{{ d.nombre }}</span> <ion-badge class="ce-pending">Pendiente</ion-badge>
                          </div>
                        }
                      }
                    </div>
                  </ion-item>
                } @empty {
                  <ion-item>No hay juntas para esta búsqueda.</ion-item>
                }
              </ion-list>
              <app-panel-pager
                [total]="juntasFiltradas().length"
                [pagina]="pagina()"
                (cambio)="pagina.set($event)"
              ></app-panel-pager>
            }
            @case ('asignaciones') {
              <app-asignar-juntas></app-asignar-juntas>
            }
            @case ('veedores') {
              <ion-button (click)="veedorAbierto.set(true)">Crear veedor</ion-button>
            }
          }
        }
      </main>
    </ion-content>
    <app-panel-modal
      titulo="Crear veedor"
      [compacto]="true"
      [abierto]="veedorAbierto()"
      [hayCambios]="veedorSinGuardar"
      [bloqueado]="veedorForm()?.guardando() ?? false"
      (cerrado)="veedorAbierto.set(false)"
    >
      @if (veedorAbierto()) {
        <app-crear-coordinador #veedorForm [recintos]="recintos()" tipo="veedor"></app-crear-coordinador>
      }
    </app-panel-modal>
    <app-panel-modal
      [titulo]="tituloActa()"
      [abierto]="detalleAbierto()"
      [hayCambios]="actaSinGuardar"
      [bloqueado]="correccion()?.ocupado() ?? false"
      (cerrado)="salirDelDetalle()"
    >
      @if (cargandoDetalle()) {
        <p role="status">Cargando acta…</p>
      }
      @if (mensajeDetalle()) {
        <p role="status">{{ mensajeDetalle() }}</p>
      }
      @if (errorDetalle()) {
        <p role="alert">{{ errorDetalle() }}</p>
      }
      @if (detalleActa(); as acta) {
        @if (editandoActa()) {
          <app-corregir-acta
            #correccion
            [acta]="acta"
            (guardada)="actualizarActaCorregida(acta)"
            (cancelada)="editandoActa.set(false)"
          ></app-corregir-acta>
        } @else {
          <ion-segment [value]="parteActa()" (ionChange)="cambiarParte($event.detail.value)">
            <ion-segment-button value="votos">Votos</ion-segment-button>
            <ion-segment-button value="evidencia">Evidencia</ion-segment-button>
          </ion-segment>
          @if (parteActa() === 'votos') {
            <ion-list class="ce-rows" aria-label="Votos del acta">
              @for (voto of acta.votos; track voto.candidatura_id) {
                <ion-item
                  ><ion-label class="ion-text-wrap">{{ voto.nombre }}</ion-label
                  ><strong slot="end">{{ voto.votos }}</strong></ion-item
                >
              }
              <ion-item
                >Blancos <strong slot="end">{{ acta.blancos }}</strong></ion-item
              >
              <ion-item
                >Nulos <strong slot="end">{{ acta.nulos }}</strong></ion-item
              >
            </ion-list>
            <p class="ce-total">Total de sufragantes: {{ acta.sufragantes }}</p>
          } @else {
            <div class="ce-acta-block">
              <h4>Foto del acta</h4>
              <p>{{ acta.tiene_foto ? 'Foto guardada' : 'Sin foto registrada' }}</p>

              @if (acta.foto_ruta) {
                <button type="button" [disabled]="cargandoFoto()" (click)="verFoto(acta)">
                  {{ cargandoFoto() ? 'Abriendo foto…' : 'Ver foto del acta' }}
                </button>

                @if (urlFoto(); as url) {
                  <p>
                    <img
                      class="ce-photo-preview"
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
            </div>
            <div class="ce-acta-block">
              <h4>Ubicación del acta</h4>
              @if (acta.gps_latitud !== null && acta.gps_longitud !== null) {
                <p>GPS: {{ acta.gps_latitud }}, {{ acta.gps_longitud }}</p>
              } @else {
                <p>Sin ubicación registrada.</p>
              }
            </div>
          }
          <ion-button fill="outline" (click)="iniciarCorreccion()">Corregir acta</ion-button>
        }
      }
    </app-panel-modal>
  `,
})
export class PanelRecintoPage {
  readonly seccion = signal<'juntas' | 'asignaciones' | 'veedores'>('juntas');
  readonly filasPorPagina = FILAS_POR_PAGINA;
  readonly pagina = signal(0);
  readonly busqueda = signal('');
  readonly juntasFiltradas = computed(() =>
    this.estadosActas().filter((estado) => String(estado.numero).includes(this.busqueda().trim())),
  );
  readonly dignidades = [
    { id: 'alcaldia', nombre: 'Alcaldía' },
    { id: 'prefectura', nombre: 'Prefectura' },
  ] as const;
  readonly detalleAbierto = signal(false);
  readonly parteActa = signal<'votos' | 'evidencia'>('votos');
  readonly tituloActa = signal('Acta');
  readonly veedorAbierto = signal(false);
  readonly veedorForm = viewChild<CrearCoordinadorComponent>('veedorForm');
  readonly correccion = viewChild<CorregirActaComponent>('correccion');
  readonly veedorSinGuardar = () => this.veedorForm()?.form.dirty ?? false;
  readonly actaSinGuardar = () => this.correccion()?.hayCambios() ?? false;

  cambiarSeccion(valor: unknown): void {
    if (valor === 'juntas' || valor === 'asignaciones' || valor === 'veedores') this.seccion.set(valor);
  }

  buscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }

  cambiarParte(valor: unknown): void {
    if (valor === 'votos' || valor === 'evidencia') this.parteActa.set(valor);
  }

  abrirDetalle(numero: number, dignidad: Dignidad): void {
    const nombre = dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura';
    this.tituloActa.set('Junta ' + numero + ' · ' + nombre);
    this.parteActa.set('votos');
    this.detalleAbierto.set(true);
    void this.verActa(numero, dignidad);
  }

  salirDelDetalle(): void {
    this.detalleAbierto.set(false);
    this.solicitudDetalle++;
    this.cargandoDetalle.set(false);
    this.cerrarDetalle();
  }

  private solicitudDetalle = 0;
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
    this.salirDelDetalle();
    this.pagina.set(0);

    try {
      const recintoId = this.auth.perfil()?.recinto_id;

      if (!recintoId) {
        throw new Error('Tu cuenta no tiene un recinto asignado.');
      }

      const [recintos, estadosActas] = await Promise.all([listarRecintos(), consultarEstadoActasRecinto()]);

      if (version !== this.versionVista) return;

      const recintoAsignado = recintos.find((recinto) => recinto.id === recintoId);

      if (!recintoAsignado) {
        throw new Error('No se pudo leer tu recinto asignado. Revisa los permisos en Supabase.');
      }

      this.recintos.set([recintoAsignado]);
      this.estadosActas.set(estadosActas);
    } catch (error) {
      if (version === this.versionVista) {
        this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los datos del recinto.');
      }
    } finally {
      if (version === this.versionVista) {
        this.cargando.set(false);
      }
    }
  }

  async verActa(numero: number, dignidad: Dignidad): Promise<void> {
    if (this.cargandoDetalle() || this.editandoActa()) return;

    const solicitud = ++this.solicitudDetalle;

    this.cerrarDetalle();
    this.cargandoDetalle.set(true);

    try {
      const acta = await consultarDetalleActaRecinto(numero, dignidad);

      if (solicitud === this.solicitudDetalle) {
        this.detalleActa.set(acta);
      }
    } catch (error) {
      if (solicitud === this.solicitudDetalle) {
        this.errorDetalle.set(error instanceof Error ? error.message : 'No se pudo consultar el acta.');
      }
    } finally {
      if (solicitud === this.solicitudDetalle) {
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
        this.errorFoto.set(error instanceof Error ? error.message : 'No se pudo abrir la foto.');
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
