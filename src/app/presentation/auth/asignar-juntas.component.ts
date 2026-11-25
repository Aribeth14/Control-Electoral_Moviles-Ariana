import { PanelModalComponent } from './panel-modal.component';
import { PanelPagerComponent, FILAS_POR_PAGINA } from './panel-pager.component';
import { IonList, IonItem, IonLabel, IonButton, IonSelect, IonSelectOption } from '@ionic/angular';
import { Component, signal } from '@angular/core';
import {
  asignarJunta,
  consultarAsignaciones,
  type AsignacionesJuntas,
  type JuntaAsignable,
} from '../../core/infrastructure/asignaciones.repository';

@Component({
  selector: 'app-asignar-juntas',
  standalone: true,
  imports: [
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonSelect,
    IonSelectOption,
    PanelModalComponent,
    PanelPagerComponent,
  ],
  template: `
    <h2>Asignaciones</h2>
    @if (ocupado() && !datos()) {
      <p role="status">Cargando asignaciones…</p>
    }
    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
    @if (error() && juntaElegida() === null) {
      <p role="alert">{{ error() }}</p>
      <ion-button fill="outline" (click)="cargar()">Reintentar</ion-button>
    }
    @if (datos(); as resultado) {
      @if (!resultado.veedores.length) {
        <p>Los veedores aparecerán cuando activen su cuenta.</p>
      }
      <ion-list class="ce-rows" aria-label="Asignaciones de juntas">
        @for (
          junta of resultado.juntas.slice(pagina() * filasPorPagina, pagina() * filasPorPagina + filasPorPagina);
          track junta.numero
        ) {
          <ion-item>
            <ion-label
              ><h3>Junta {{ junta.numero }}</h3>
              <p>{{ junta.veedor_nombre || 'Sin asignar' }}</p></ion-label
            >
            <ion-button
              slot="end"
              fill="outline"
              [disabled]="!resultado.veedores.length || ocupado()"
              (click)="abrir(junta)"
            >
              {{ junta.veedor_id ? 'Reasignar' : 'Asignar' }}
            </ion-button>
          </ion-item>
        } @empty {
          <ion-item>No hay juntas en este recinto.</ion-item>
        }
      </ion-list>
      <app-panel-pager
        [total]="resultado.juntas.length"
        [pagina]="pagina()"
        (cambio)="pagina.set($event)"
      ></app-panel-pager>
    }
    <app-panel-modal
      [titulo]="'Asignar junta ' + (juntaElegida()?.numero ?? '')"
      [abierto]="juntaElegida() !== null"
      [bloqueado]="ocupado()"
      [hayCambios]="asignacionSinGuardar"
      (cerrado)="juntaElegida.set(null)"
    >
      @if (juntaElegida(); as junta) {
        <ion-select
          label="Veedor"
          labelPlacement="stacked"
          placeholder="Selecciona un veedor"
          interface="popover"
          [value]="veedorElegido()"
          [disabled]="ocupado()"
          (ionChange)="veedorElegido.set($event.detail.value)"
        >
          @for (veedor of datos()?.veedores ?? []; track veedor.id) {
            <ion-select-option [value]="veedor.id">{{ veedor.nombre }}</ion-select-option>
          }
        </ion-select>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        <ion-button [disabled]="ocupado() || !veedorElegido()" (click)="guardar('' + junta.numero, veedorElegido())">
          {{ ocupado() ? 'Guardando…' : 'Guardar asignación' }}
        </ion-button>
        @if (mensaje()) {
          <p role="status">{{ mensaje() }}</p>
        }
      }
    </app-panel-modal>
  `,
})
export class AsignarJuntasComponent {
  readonly filasPorPagina = FILAS_POR_PAGINA;
  readonly pagina = signal(0);
  readonly juntaElegida = signal<JuntaAsignable | null>(null);
  readonly veedorElegido = signal('');
  readonly asignacionSinGuardar = () =>
    Boolean(this.veedorElegido() && this.veedorElegido() !== (this.juntaElegida()?.veedor_id ?? ''));

  abrir(junta: JuntaAsignable): void {
    this.error.set('');
    this.mensaje.set('');
    this.veedorElegido.set(junta.veedor_id ?? '');
    this.juntaElegida.set(junta);
  }

  readonly datos = signal<AsignacionesJuntas | null>(null);
  readonly ocupado = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');

  async cargar(): Promise<void> {
    await this.ejecutar(async () => {
      this.datos.set(await consultarAsignaciones());
    });
  }

  async guardar(junta: string, veedor: string): Promise<void> {
    if (this.ocupado()) return;

    if (!junta || !veedor) {
      this.mensaje.set('');
      this.error.set('Selecciona una junta y un veedor.');
      return;
    }

    await this.ejecutar(async () => {
      await asignarJunta(Number(junta), veedor);
      const seleccion = this.juntaElegida();
      if (seleccion) this.juntaElegida.set({ ...seleccion, veedor_id: veedor });
      this.mensaje.set('Asignación guardada.');
      this.datos.set(await consultarAsignaciones());
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;

    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');

    try {
      await accion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
