import { PanelModalComponent } from './panel-modal.component';
import { PanelPagerComponent, FILAS_POR_PAGINA } from './panel-pager.component';
import {
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonProgressBar,
} from '@ionic/angular';
import { Component, computed, OnInit, input, signal } from '@angular/core';
import {
  consultarAvanceProvincial,
  consultarResultadosProvinciales,
  type AvanceRecinto,
  type ResultadosProvinciales,
} from '../../core/infrastructure/provincial.repository';

@Component({
  selector: 'app-resumen-provincial',
  standalone: true,
  imports: [
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonProgressBar,
    PanelModalComponent,
    PanelPagerComponent,
  ],
  template: `
    @if (seccion() === 'avance') {
      <div class="ce-filters">
        <ion-searchbar
          aria-label="Buscar recinto"
          placeholder="Buscar recinto o parroquia"
          [value]="busqueda()"
          (ionInput)="buscar($event.detail.value ?? '')"
        ></ion-searchbar>
      </div>
      @if (!cargando() || avance().length) {
        <ion-list class="ce-rows" aria-label="Avance por recinto">
          @for (
            fila of filtrados().slice(pagina() * filasPorPagina, pagina() * filasPorPagina + filasPorPagina);
            track fila.recinto_id
          ) {
            <ion-item [button]="true" (click)="detalle.set(fila)">
              <ion-label>
                <h3>{{ fila.recinto }}</h3>
                <p>{{ fila.parroquia }}</p>
                <p class="ce-counts">
                  <span>Alcaldía {{ fila.alcaldia_reportadas }}/{{ fila.juntas_totales }}</span>
                  <span>Prefectura {{ fila.prefectura_reportadas }}/{{ fila.juntas_totales }}</span>
                </p>
              </ion-label>
            </ion-item>
          } @empty {
            @if (!error()) {
              <ion-item>No hay recintos para esta búsqueda.</ion-item>
            }
          }
        </ion-list>
        <app-panel-pager
          [total]="filtrados().length"
          [pagina]="pagina()"
          (cambio)="pagina.set($event)"
        ></app-panel-pager>
      }
    } @else if (seccion() === 'resultados') {
      <div class="ce-filters">
        <ion-select
          label="Consolidado / Recinto"
          labelPlacement="stacked"
          interface="popover"
          [value]="recintoSeleccionado()"
          [disabled]="cargando()"
          (ionChange)="cambiarRecinto($event.detail.value)"
        >
          <ion-select-option value="">Consolidado de todos los recintos</ion-select-option>
          @for (fila of avance(); track fila.recinto_id) {
            <ion-select-option [value]="fila.recinto_id">{{ fila.recinto }} · {{ fila.parroquia }}</ion-select-option>
          }
        </ion-select>
        <ion-segment [value]="dignidad()" (ionChange)="elegirDignidad($event.detail.value)">
          <ion-segment-button value="alcaldia">Alcaldía</ion-segment-button>
          <ion-segment-button value="prefectura">Prefectura</ion-segment-button>
        </ion-segment>
      </div>
      @if (resultados()) {
        <ion-list class="ce-rows" aria-label="Resultados por candidatura">
          @for (fila of dignidad() === 'alcaldia' ? votosAlcaldia() : votosPrefectura(); track fila.id) {
            <ion-item>
              <ion-label
                ><h3>{{ fila.candidato }}</h3>
                <p>Lista {{ fila.lista }}</p></ion-label
              >
              <strong slot="end">{{ fila.votos }} votos</strong>
            </ion-item>
          } @empty {
            <ion-item>No hay resultados para esta selección.</ion-item>
          }
        </ion-list>
        <ion-button fill="outline" (click)="ubicacionesAbiertas.set(true)">Ver ubicación de actas</ion-button>
      }
    }
    @if (cargando()) {
      <p role="status">Cargando datos provinciales…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (seccion() !== 'gestion') {
      <ion-button fill="clear" [disabled]="cargando()" (click)="actualizar()">Actualizar</ion-button>
    }

    <app-panel-modal
      [titulo]="detalle()?.recinto ?? 'Avance'"
      [abierto]="detalle() !== null"
      (cerrado)="detalle.set(null)"
    >
      @if (detalle(); as fila) {
        <p>{{ fila.parroquia }}</p>
        <div class="ce-progress">
          <span><strong>Alcaldía</strong> {{ fila.alcaldia_reportadas }} de {{ fila.juntas_totales }}</span>
          <ion-progress-bar
            aria-label="Alcaldía"
            [value]="fila.alcaldia_reportadas / (fila.juntas_totales || 1)"
          ></ion-progress-bar>
        </div>
        <div class="ce-progress">
          <span><strong>Prefectura</strong> {{ fila.prefectura_reportadas }} de {{ fila.juntas_totales }}</span>
          <ion-progress-bar
            aria-label="Prefectura"
            [value]="fila.prefectura_reportadas / (fila.juntas_totales || 1)"
          ></ion-progress-bar>
        </div>
      }
    </app-panel-modal>
    <app-panel-modal
      titulo="Ubicación de actas"
      [abierto]="ubicacionesAbiertas()"
      (cerrado)="ubicacionesAbiertas.set(false); actaSeleccionada.set(null)"
    >
      @if (actaSeleccionada(); as acta) {
        <ion-button fill="outline" (click)="actaSeleccionada.set(null)">Volver a las actas</ion-button>
        <h2>{{ acta.recinto }} · Junta {{ acta.junta }}</h2>
        @if (acta.latitud !== null && acta.longitud !== null) {
          <p>Latitud {{ acta.latitud }} · Longitud {{ acta.longitud }}</p>
        } @else {
          <p>Sin ubicación registrada.</p>
        }
      } @else {
        <ion-list class="ce-rows" aria-label="Actas">
          @for (
            acta of actas().slice(paginaActas() * filasPorPagina, paginaActas() * filasPorPagina + filasPorPagina);
            track acta.id
          ) {
            <ion-item [button]="true" (click)="actaSeleccionada.set(acta)">
              <ion-label
                ><h3>{{ acta.recinto }}</h3>
                <p>Junta {{ acta.junta }}</p></ion-label
              >
            </ion-item>
          } @empty {
            <ion-item>Todavía no hay actas para este filtro.</ion-item>
          }
        </ion-list>
        <app-panel-pager
          [total]="actas().length"
          [pagina]="paginaActas()"
          (cambio)="paginaActas.set($event)"
        ></app-panel-pager>
      }
    </app-panel-modal>
  `,
})
export class ResumenProvincialComponent implements OnInit {
  readonly seccion = input.required<'avance' | 'resultados' | 'gestion'>();
  readonly busqueda = signal('');
  readonly filasPorPagina = FILAS_POR_PAGINA;
  readonly pagina = signal(0);
  readonly paginaActas = signal(0);
  readonly detalle = signal<AvanceRecinto | null>(null);
  readonly dignidad = signal<'alcaldia' | 'prefectura'>('alcaldia');
  readonly ubicacionesAbiertas = signal(false);
  readonly actaSeleccionada = signal<ResultadosProvinciales['actas'][number] | null>(null);
  readonly actas = computed(() => this.resultados()?.actas.filter((acta) => acta.dignidad === this.dignidad()) ?? []);
  readonly filtrados = computed(() => {
    const consulta = this.normalizar(this.busqueda().trim());
    return this.avance().filter((fila) => this.normalizar(fila.recinto + ' ' + fila.parroquia).includes(consulta));
  });

  buscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }

  elegirDignidad(valor: unknown): void {
    if (valor === 'alcaldia' || valor === 'prefectura') {
      this.dignidad.set(valor);
      this.paginaActas.set(0);
    }
  }

  private normalizar(valor: string): string {
    return valor
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  readonly avance = signal<AvanceRecinto[]>([]);
  readonly recintoSeleccionado = signal('');
  readonly resultados = signal<ResultadosProvinciales | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly votosAlcaldia = computed(
    () => this.resultados()?.votos.filter((fila) => fila.dignidad === 'alcaldia') ?? [],
  );

  readonly votosPrefectura = computed(
    () => this.resultados()?.votos.filter((fila) => fila.dignidad === 'prefectura') ?? [],
  );

  ngOnInit(): void {
    void this.actualizar();
  }

  async actualizar(): Promise<void> {
    await this.cargar(true);
  }

  async cambiarRecinto(recintoId: string): Promise<void> {
    if (this.cargando()) return;

    this.recintoSeleccionado.set(recintoId);
    await this.cargar(false);
  }

  private async cargar(actualizarAvance: boolean): Promise<void> {
    if (this.cargando()) return;

    this.cargando.set(true);
    this.error.set('');
    this.resultados.set(null);
    this.paginaActas.set(0);

    try {
      if (actualizarAvance) {
        const avance = await consultarAvanceProvincial();
        this.avance.set(avance);
        this.pagina.set(0);

        if (!avance.some((fila) => fila.recinto_id === this.recintoSeleccionado())) {
          this.recintoSeleccionado.set('');
        }
      }

      const datos = await consultarResultadosProvinciales(this.recintoSeleccionado() || null);
      this.resultados.set(datos);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los resultados.');
    } finally {
      this.cargando.set(false);
    }
  }
}
