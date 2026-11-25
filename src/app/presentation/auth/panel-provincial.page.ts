import { PanelHeaderComponent } from './panel-header.component';
import { PanelModalComponent } from './panel-modal.component';
import { PanelPagerComponent, FILAS_POR_PAGINA } from './panel-pager.component';
import { Component, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import {
  listarJuntas,
  listarRecintos,
  registrarRecinto,
  type Junta,
  type Recinto,
} from '../../core/infrastructure/recintos.repository';
import { CrearCoordinadorComponent } from './crear-coordinador.component';
import { ResumenProvincialComponent } from './resumen-provincial.component';

@Component({
  standalone: true,
  imports: [
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel,
    PanelHeaderComponent,
    PanelModalComponent,
    PanelPagerComponent,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    CrearCoordinadorComponent,
    ResumenProvincialComponent,
  ],
  template: `
    <app-panel-header titulo="Provincial"></app-panel-header>
    <ion-segment class="ce-segments" [value]="seccion()" (ionChange)="cambiarSeccion($event.detail.value)">
      <ion-segment-button value="avance">Avance</ion-segment-button>
      <ion-segment-button value="resultados">Resultados</ion-segment-button>
      <ion-segment-button value="gestion">Gestión</ion-segment-button>
    </ion-segment>
    <ion-content class="ce-panel">
      <main class="ce-main ce-compact">
        <app-resumen-provincial
          #resumen
          [seccion]="seccion()"
          [hidden]="seccion() === 'gestion'"
        ></app-resumen-provincial>
        @if (seccion() === 'gestion') {
          <div class="ce-actions">
            <ion-button (click)="gestion.set('recinto')">Registrar recinto</ion-button>
            <ion-button fill="outline" (click)="gestion.set('coordinador')">Crear coordinador</ion-button>
          </div>
          <h2>Recintos registrados</h2>
          @if (confirmacion()) {
            <p role="status">{{ confirmacion() }}</p>
          }
          @if (cargando()) {
            <p role="status">Cargando recintos…</p>
          } @else if (errorLista()) {
            <p role="alert">{{ errorLista() }}</p>
            <ion-button fill="outline" (click)="cargar()">Reintentar</ion-button>
          } @else {
            <ion-list class="ce-rows" aria-label="Recintos registrados">
              @for (
                recinto of recintos().slice(pagina() * filasPorPagina, pagina() * filasPorPagina + filasPorPagina);
                track recinto.id
              ) {
                <ion-item [button]="true" (click)="abrirJuntas(recinto)">
                  <ion-label
                    ><h3>{{ recinto.nombre }}</h3>
                    <p>{{ recinto.parroquia }} · {{ recinto.cantidad_jrv }} JRV</p></ion-label
                  >
                </ion-item>
              } @empty {
                <ion-item>Todavía no hay recintos registrados.</ion-item>
              }
            </ion-list>
            <app-panel-pager
              [total]="recintos().length"
              [pagina]="pagina()"
              (cambio)="pagina.set($event)"
            ></app-panel-pager>
          }
        }
      </main>
    </ion-content>
    <app-panel-modal
      titulo="Registrar recinto"
      [abierto]="gestion() === 'recinto'"
      [hayCambios]="recintoSinGuardar"
      [bloqueado]="guardando()"
      (cerrado)="cerrarRegistro()"
    >
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <ion-input label="Nombre del recinto" labelPlacement="stacked" formControlName="nombre"></ion-input>

        <ion-select
          label="Parroquia"
          labelPlacement="stacked"
          placeholder="Selecciona una parroquia"
          interface="popover"
          formControlName="parroquia"
        >
          @for (parroquia of parroquias; track parroquia) {
            <ion-select-option [value]="parroquia">
              {{ parroquia }}
            </ion-select-option>
          }
        </ion-select>

        <ion-input
          label="Cantidad de juntas receptoras del voto"
          labelPlacement="stacked"
          type="number"
          inputmode="numeric"
          min="1"
          max="2147483647"
          step="1"
          formControlName="cantidad_jrv"
        ></ion-input>

        <ion-button expand="block" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar recinto' }}
        </ion-button>

        @if (errorFormulario()) {
          <p role="alert">{{ errorFormulario() }}</p>
        }

        @if (confirmacion()) {
          <p role="status">{{ confirmacion() }}</p>
        }
      </form>
    </app-panel-modal>
    <app-panel-modal
      titulo="Crear coordinador"
      [abierto]="gestion() === 'coordinador'"
      [hayCambios]="coordinadorSinGuardar"
      [bloqueado]="coordinadorForm()?.guardando() ?? false"
      (cerrado)="gestion.set(null)"
    >
      @if (gestion() === 'coordinador') {
        <app-crear-coordinador #coordinadorForm [recintos]="recintos()"></app-crear-coordinador>
      }
    </app-panel-modal>
    <app-panel-modal
      [titulo]="recintoDetalle()?.nombre ?? 'Juntas'"
      [abierto]="recintoDetalle() !== null"
      (cerrado)="cerrarJuntas()"
    >
      @if (cargandoJuntas()) {
        <p role="status">Consultando las juntas del recinto…</p>
      } @else if (errorJuntas()) {
        <p role="alert">{{ errorJuntas() }}</p>
        <ion-button fill="outline" (click)="reintentarJuntas()">Reintentar</ion-button>
      } @else {
        <ion-list class="ce-rows" aria-label="Juntas del recinto">
          @for (
            junta of juntas().slice(paginaJuntas() * filasPorPagina, paginaJuntas() * filasPorPagina + filasPorPagina);
            track junta.id
          ) {
            <ion-item>Junta {{ junta.numero }}</ion-item>
          } @empty {
            <ion-item>Este recinto todavía no tiene juntas.</ion-item>
          }
        </ion-list>
        <app-panel-pager
          [total]="juntas().length"
          [pagina]="paginaJuntas()"
          (cambio)="paginaJuntas.set($event)"
        ></app-panel-pager>
      }
    </app-panel-modal>
  `,
})
export class PanelProvincialPage {
  readonly seccion = signal<'avance' | 'resultados' | 'gestion'>('avance');
  readonly gestion = signal<'recinto' | 'coordinador' | null>(null);
  readonly filasPorPagina = FILAS_POR_PAGINA;
  readonly pagina = signal(0);
  private readonly resumen = viewChild<ResumenProvincialComponent>('resumen');
  private solicitudJuntas = 0;
  readonly paginaJuntas = signal(0);
  readonly recintoDetalle = signal<Recinto | null>(null);
  readonly coordinadorForm = viewChild<CrearCoordinadorComponent>('coordinadorForm');
  readonly recintoSinGuardar = () => this.form.dirty;
  readonly coordinadorSinGuardar = () => this.coordinadorForm()?.form.dirty ?? false;

  cambiarSeccion(valor: unknown): void {
    if (valor === 'avance' || valor === 'resultados' || valor === 'gestion') this.seccion.set(valor);
  }

  cerrarRegistro(): void {
    this.gestion.set(null);
    this.form.reset();
    this.errorFormulario.set('');
  }

  abrirJuntas(recinto: Recinto): void {
    this.paginaJuntas.set(0);
    this.recintoDetalle.set(recinto);
    void this.mostrarJuntas(recinto.id);
  }

  cerrarJuntas(): void {
    this.recintoDetalle.set(null);
    this.solicitudJuntas++;
    this.cargandoJuntas.set(false);
  }

  reintentarJuntas(): void {
    const recinto = this.recintoDetalle();
    if (recinto) void this.mostrarJuntas(recinto.id);
  }

  private readonly fb = inject(FormBuilder);

  readonly parroquias: readonly string[] = [
    'Alangasí',
    'Amaguaña',
    'Atahualpa – Quito',
    'Belisario Quevedo – Quito',
    'Calacalí',
    'Calderón – Quito',
    'Carcelén',
    'Centro Histórico',
    'Chavezpamba',
    'Checa – Quito',
    'Chilibulo',
    'Chillogallo',
    'Chimbacalle',
    'Cochapamba – Quito',
    'Comité del Pueblo',
    'Conocoto',
    'Cotocollao',
    'Cumbayá',
    'El Condado',
    'El Inca',
    'El Quinche',
    'Guamaní',
    'Guangopolo',
    'Guayllabamba',
    'Iñaquito',
    'Itchimbía',
    'Jipijapa – Quito',
    'Kennedy',
    'La Argelia',
    'La Concepción – Quito',
    'La Ecuatoriana',
    'La Ferroviaria',
    'La Libertad – Quito',
    'La Magdalena',
    'La Mena',
    'La Merced',
    'Llano Chico',
    'Lloa',
    'Mariscal Sucre – Quito',
    'Nanegal',
    'Nanegalito',
    'Nayón',
    'Nono',
    'Pacto',
    'Perucho',
    'Pifo',
    'Píntag',
    'Pomasqui',
    'Ponceano',
    'Puéllaro',
    'Puembo',
    'Puengasí',
    'Quitumbe',
    'Rumipamba – Quito',
    'San Antonio de Pichincha',
    'San Bartolo',
    'San José de Minas',
  ];

  readonly recintos = signal<Recinto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly errorLista = signal('');
  readonly errorFormulario = signal('');
  readonly confirmacion = signal('');

  readonly juntas = signal<Junta[]>([]);
  readonly cargandoJuntas = signal(false);
  readonly errorJuntas = signal('');

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    parroquia: this.fb.nonNullable.control('', Validators.required),
    cantidad_jrv: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(2147483647),
    ]),
  });

  ionViewWillEnter(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorLista.set('');

    try {
      this.recintos.set(await listarRecintos());
    } catch {
      this.errorLista.set('No se pudo cargar la lista de recintos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async mostrarJuntas(recintoId: string): Promise<void> {
    const solicitud = ++this.solicitudJuntas;
    this.juntas.set([]);
    this.errorJuntas.set('');
    this.cargandoJuntas.set(true);

    try {
      const juntas = await listarJuntas(recintoId);
      if (solicitud === this.solicitudJuntas) this.juntas.set(juntas);
    } catch {
      if (solicitud === this.solicitudJuntas) {
        this.errorJuntas.set('No se pudieron cargar las juntas de este recinto.');
      }
    } finally {
      if (solicitud === this.solicitudJuntas) this.cargandoJuntas.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.errorFormulario.set('');
    this.confirmacion.set('');
    this.form.markAllAsTouched();

    const datos = this.form.getRawValue();
    const nombre = datos.nombre.trim();
    const parroquia = datos.parroquia;
    const cantidadJrv = datos.cantidad_jrv;

    if (!nombre) {
      this.errorFormulario.set('Escribe el nombre del recinto.');
      return;
    }

    if (!this.parroquias.includes(parroquia)) {
      this.errorFormulario.set('Selecciona una parroquia de la lista.');
      return;
    }

    if (cantidadJrv === null || this.form.controls.cantidad_jrv.invalid || !Number.isInteger(cantidadJrv)) {
      this.errorFormulario.set('Ingresa una cantidad entera de JRV mayor a cero.');
      return;
    }

    this.guardando.set(true);

    try {
      await registrarRecinto({
        provincia: 'Pichincha',
        canton: 'Quito',
        parroquia,
        nombre,
        cantidad_jrv: cantidadJrv,
      });

      this.form.reset();
      this.confirmacion.set('Recinto guardado.');
      this.pagina.set(0);
      await Promise.all([this.cargar(), this.resumen()?.actualizar()]);
    } catch (error) {
      this.errorFormulario.set(error instanceof Error ? error.message : 'No se pudo guardar el recinto.');
    } finally {
      this.guardando.set(false);
    }
  }
}
