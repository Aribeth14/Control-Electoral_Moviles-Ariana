import { Component, signal } from '@angular/core';
import {
  asignarJunta,
  consultarAsignaciones,
  type AsignacionesJuntas,
} from '../../core/infrastructure/asignaciones.repository';

@Component({
  selector: 'app-asignar-juntas',
  standalone: true,
  template: `
    <h2>Asignar juntas</h2>

    @if (datos(); as resultado) {
      @if (resultado.veedores.length === 0) {
        <p>Cuando un veedor de tu recinto active su cuenta, aparecerá aquí.</p>
      } @else {
        <p>
          <label for="junta">Junta</label>
          <select id="junta" #junta [disabled]="ocupado()">
            <option value="">Selecciona una junta</option>
            @for (item of resultado.juntas; track item.numero) {
              <option [value]="item.numero">
                Junta {{ item.numero }} ·
                {{ item.veedor_id ? item.veedor_nombre : 'Sin asignar' }}
              </option>
            }
          </select>
        </p>

        <p>
          <label for="veedor">Veedor</label>
          <select id="veedor" #veedor [disabled]="ocupado()">
            <option value="">Selecciona un veedor</option>
            @for (item of resultado.veedores; track item.id) {
              <option [value]="item.id">{{ item.nombre }}</option>
            }
          </select>
        </p>

        <button
          type="button"
          [disabled]="ocupado() || resultado.juntas.length === 0"
          (click)="guardar(junta.value, veedor.value)"
        >
          Guardar asignación
        </button>
      }
    }

    @if (ocupado()) {
      <p role="status">Procesando…</p>
    }

    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }

    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
  `,
})
export class AsignarJuntasComponent {
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