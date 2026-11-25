import { PanelHeaderComponent } from './panel-header.component';
import { PanelModalComponent } from './panel-modal.component';
import { PanelPagerComponent, FILAS_POR_PAGINA } from './panel-pager.component';
import { Component, computed, signal, viewChild } from '@angular/core';
import { IonButton, IonContent, IonList, IonItem } from '@ionic/angular';
import { consultarDetalleActaRecinto, type DetalleActaRecinto } from '../../core/infrastructure/actas.repository';
import { consultarAsignaciones, type JuntaAsignable } from '../../core/infrastructure/asignaciones.repository';
import { CorregirActaComponent } from './corregir-acta.component';
import { RegistrarActaComponent } from './registrar-acta.component';

@Component({
  standalone: true,
  imports: [
    IonList,
    IonItem,
    PanelHeaderComponent,
    PanelModalComponent,
    PanelPagerComponent,
    IonButton,
    IonContent,
    RegistrarActaComponent,
    CorregirActaComponent,
  ],
  template: `
    <app-panel-header titulo="Veedor"></app-panel-header>
    <ion-content class="ce-panel">
      <main class="ce-main ce-compact">
        <h1>Mis juntas</h1>
        @if (cargando()) {
          <p role="status">Cargando juntas…</p>
        } @else if (error()) {
          <p role="alert">{{ error() }}</p>
        } @else {
          <ion-list class="ce-rows" aria-label="Mis juntas">
            @for (
              junta of juntas().slice(pagina() * filasPorPagina, pagina() * filasPorPagina + filasPorPagina);
              track junta.numero
            ) {
              <ion-item [button]="true" (click)="abrirJunta(junta.numero)">
                <strong class="ce-junta"><small>Junta</small>{{ junta.numero }}</strong>
              </ion-item>
            } @empty {
              <ion-item>Todavía no tienes juntas asignadas.</ion-item>
            }
          </ion-list>
          <app-panel-pager
            [total]="juntas().length"
            [pagina]="pagina()"
            (cambio)="pagina.set($event)"
          ></app-panel-pager>
        }
        @if (mensajeCorreccion()) {
          <p role="status">{{ mensajeCorreccion() }}</p>
        }
        <ion-button fill="clear" [disabled]="cargando()" (click)="cargar()">Actualizar</ion-button>
      </main>
    </ion-content>
    <app-panel-modal
      [titulo]="tituloJunta()"
      [abierto]="juntaAbierta() !== null"
      (cerrado)="cerrarJunta()"
      [hayCambios]="actaSinGuardar"
      [bloqueado]="formularioOcupado()"
    >
      @if (actaParaCorregir(); as acta) {
        <h2>{{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}</h2>
        <app-corregir-acta
          #correccion
          [acta]="acta"
          (guardada)="finalizarCorreccion()"
          (cancelada)="actaParaCorregir.set(null)"
        ></app-corregir-acta>
      } @else if (juntaSeleccionada() !== null) {
        <app-registrar-acta
          #registro
          [numeroJunta]="juntaSeleccionada()!"
          (guardada)="actualizarAcciones()"
        ></app-registrar-acta>
      } @else if (juntaAbierta(); as numero) {
        <ion-list class="ce-rows" aria-label="Acciones de la junta">
          <ion-item [button]="true" (click)="juntaSeleccionada.set(numero)">Registrar acta</ion-item>
          @for (acta of actasDisponibles(); track acta.dignidad) {
            <ion-item [button]="true" (click)="actaParaCorregir.set(acta)">
              Corregir {{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}
            </ion-item>
          }
        </ion-list>
        @if (consultandoActa()) {
          <p role="status">Consultando actas de la junta…</p>
        }
        @if (errorCorreccion()) {
          <p role="alert">{{ errorCorreccion() }}</p>
          <ion-button fill="outline" (click)="actualizarAcciones()">Reintentar</ion-button>
        }
      }
    </app-panel-modal>
  `,
})
export class PanelVeedorPage {
  private solicitud = 0;
  readonly filasPorPagina = FILAS_POR_PAGINA;
  readonly pagina = signal(0);
  readonly juntaAbierta = signal<number | null>(null);
  readonly actasDisponibles = signal<DetalleActaRecinto[]>([]);
  readonly registro = viewChild<RegistrarActaComponent>('registro');
  readonly correccion = viewChild<CorregirActaComponent>('correccion');
  readonly tituloJunta = computed(() => 'Junta ' + (this.juntaAbierta() ?? ''));
  readonly formularioOcupado = computed(() => this.registro()?.ocupado() || this.correccion()?.ocupado() || false);
  readonly actaSinGuardar = () => Boolean(this.registro()?.hayCambios() || this.correccion()?.hayCambios());

  abrirJunta(numero: number): void {
    this.juntaAbierta.set(numero);
    void this.actualizarAcciones();
  }

  cerrarJunta(): void {
    this.solicitud++;
    this.juntaAbierta.set(null);
    this.juntaSeleccionada.set(null);
    this.actaParaCorregir.set(null);
    this.actasDisponibles.set([]);
    this.consultandoActa.set(false);
    this.errorCorreccion.set('');
  }

  readonly juntas = signal<JuntaAsignable[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly juntaSeleccionada = signal<number | null>(null);

  readonly actaParaCorregir = signal<DetalleActaRecinto | null>(null);
  readonly consultandoActa = signal(false);
  readonly errorCorreccion = signal('');
  readonly mensajeCorreccion = signal('');

  ionViewWillEnter(): Promise<void> {
    return this.cargar();
  }

  async cargar(): Promise<void> {
    this.cerrarJunta();
    this.pagina.set(0);
    this.errorCorreccion.set('');
    this.mensajeCorreccion.set('');
    this.cargando.set(true);
    this.error.set('');
    this.juntas.set([]);

    try {
      const resultado = await consultarAsignaciones();
      this.juntas.set(resultado.juntas);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar tus juntas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async actualizarAcciones(): Promise<void> {
    const numero = this.juntaAbierta();
    if (numero === null) return;

    const solicitud = ++this.solicitud;
    this.errorCorreccion.set('');
    this.consultandoActa.set(true);
    const dignidades = ['alcaldia', 'prefectura'] as const;
    try {
      const resultados = await Promise.allSettled(
        dignidades.map((dignidad) => consultarDetalleActaRecinto(numero, dignidad)),
      );
      if (solicitud !== this.solicitud) return;
      const disponibles: DetalleActaRecinto[] = [];
      for (const resultado of resultados) {
        if (resultado.status === 'fulfilled') {
          disponibles.push(resultado.value);
        } else if (resultado.reason?.message !== 'El acta solicitada no está disponible para tu cuenta.') {
          this.errorCorreccion.set('No se pudieron consultar todas las actas de la junta.');
        }
      }
      this.actasDisponibles.set(disponibles);
    } finally {
      if (solicitud === this.solicitud) this.consultandoActa.set(false);
    }
  }

  finalizarCorreccion(): void {
    this.actaParaCorregir.set(null);
    this.mensajeCorreccion.set('Corrección guardada.');
    void this.actualizarAcciones();
  }
}
