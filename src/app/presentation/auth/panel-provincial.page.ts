import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {IonButton,IonContent,IonInput,IonSelect,IonSelectOption,} from '@ionic/angular';
import {
  listarJuntas,
  listarRecintos,
  registrarRecinto,
  type Junta,
  type Recinto,
} from '../../core/infrastructure/recintos.repository';
import { CrearCoordinadorComponent } from './crear-coordinador.component';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    CrearCoordinadorComponent,
  ],
  template: `
    <ion-content class="ion-padding">
      <h1>Panel provincial</h1>

      <h2>Registrar recinto</h2>
      <p>Pichincha · Quito</p>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <ion-input
          label="Nombre del recinto"
          labelPlacement="stacked"
          formControlName="nombre"
        ></ion-input>

        <ion-select
          label="Parroquia"
          labelPlacement="stacked"
          placeholder="Selecciona una parroquia"
          interface="modal"
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
      <app-crear-coordinador [recintos]="recintos()"></app-crear-coordinador>

      <h2>Recintos registrados</h2>

      @if (cargando()) {
        <p role="status">Cargando recintos…</p>
      } @else if (errorLista()) {
        <p role="alert">{{ errorLista() }}</p>
        <ion-button type="button" fill="outline" (click)="cargar()">
          Reintentar
        </ion-button>
      } @else {
        <ul>
          @for (recinto of recintos(); track recinto.id) {
            <li>
              <strong>{{ recinto.nombre }}</strong>
              <p>{{ recinto.parroquia }} · {{ recinto.cantidad_jrv }} JRV</p>

              <ion-button
                type="button"
                fill="outline"
                [disabled]="cargandoJuntas()"
                [attr.aria-expanded]="recintoAbierto() === recinto.id"
                (click)="mostrarJuntas(recinto.id)"
              >
                @if (recintoAbierto() !== recinto.id) {
                  Ver juntas
                } @else if (cargandoJuntas()) {
                  Cargando juntas…
                } @else if (errorJuntas()) {
                  Reintentar
                } @else {
                  Ocultar juntas
                }
              </ion-button>

              @if (recintoAbierto() === recinto.id) {
                @if (cargandoJuntas()) {
                  <p role="status">Consultando las juntas del recinto…</p>
                } @else if (errorJuntas()) {
                  <p role="alert">{{ errorJuntas() }}</p>
                } @else {
                  <ul>
                    @for (junta of juntas(); track junta.id) {
                      <li>Junta {{ junta.numero }}</li>
                    } @empty {
                      <li>Este recinto todavía no tiene juntas.</li>
                    }
                  </ul>
                }
              }
            </li>
          } @empty {
            <li>Todavía no hay recintos registrados.</li>
          }
        </ul>
      }
    </ion-content>
  `,
})
export class PanelProvincialPage {
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

  readonly recintoAbierto = signal<string | null>(null);
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

  async mostrarJuntas(recintoId: string): Promise<void> {
    if (this.cargandoJuntas()) return;

    if (this.recintoAbierto() === recintoId && !this.errorJuntas()) {
      this.recintoAbierto.set(null);
      return;
    }

    this.recintoAbierto.set(recintoId);
    this.juntas.set([]);
    this.errorJuntas.set('');
    this.cargandoJuntas.set(true);

    try {
      this.juntas.set(await listarJuntas(recintoId));
    } catch {
      this.errorJuntas.set('No se pudieron cargar las juntas de este recinto.');
    } finally {
      this.cargandoJuntas.set(false);
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

    if (
      cantidadJrv === null ||
      this.form.controls.cantidad_jrv.invalid ||
      !Number.isInteger(cantidadJrv)
    ) {
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
      await this.cargar();
    } catch (error) {
      this.errorFormulario.set(
        error instanceof Error ? error.message : 'No se pudo guardar el recinto.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}