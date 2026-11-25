import { Component, input, output, signal } from '@angular/core';
import {
  corregirActaRecinto,
  type DetalleActaRecinto,
} from '../../core/infrastructure/actas.repository';
import {
  tomarFotoActa,
  type FotoActa,
} from '../../core/infrastructure/evidencia-acta';

@Component({
  selector: 'app-corregir-acta',
  standalone: true,
  template: `
    <h4>Corregir acta</h4>

    <form #formulario (submit)="guardar($event, formulario)">
      <fieldset [disabled]="guardando() || tomandoFoto()">
        <legend>Datos corregidos</legend>

        @for (voto of acta().votos; track voto.candidatura_id) {
          <p>
            <label>
              {{ voto.nombre }}
              <input
                type="number"
                [name]="'voto-' + voto.candidatura_id"
                [value]="voto.votos"
                min="0"
                step="1"
                required
              />
            </label>
          </p>
        }

        <p>
          <label>
            Blancos
            <input type="number" name="blancos" [value]="acta().blancos"
              min="0" step="1" required />
          </label>
        </p>

        <p>
          <label>
            Nulos
            <input type="number" name="nulos" [value]="acta().nulos"
              min="0" step="1" required />
          </label>
        </p>

        <p>
          <label>
            Total de sufragantes
            <input type="number" name="sufragantes" [value]="acta().sufragantes"
              min="0" step="1" required />
          </label>
        </p>

        <p>
          <label>
            Motivo de la corrección
            <textarea name="motivo" maxlength="500" required></textarea>
          </label>
        </p>

        <button type="button" (click)="tomarFoto()">
          {{ foto() ? 'Volver a tomar foto' : 'Tomar foto nueva (opcional)' }}
        </button>

        @if (foto(); as evidencia) {
          <p>Foto nueva aceptada. Nitidez {{ evidencia.nitidez.toFixed(1) }}.</p>
          <img [src]="evidencia.ruta" alt="Foto nueva del acta" width="240" />
        }

        <p>
          <button type="submit">
            {{ guardando() ? 'Guardando…' : 'Guardar corrección' }}
          </button>

          <button type="button" (click)="cancelada.emit()">Cancelar</button>
        </p>
      </fieldset>
    </form>

    @if (tomandoFoto()) {
      <p role="status">Comprobando la foto…</p>
    }

    @if (errorFoto()) {
      <p role="alert">{{ errorFoto() }}</p>
    }

    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
  `,
})
export class CorregirActaComponent {
  readonly acta = input.required<DetalleActaRecinto>();
  readonly guardada = output<void>();
  readonly cancelada = output<void>();

  readonly foto = signal<FotoActa | null>(null);
  readonly tomandoFoto = signal(false);
  readonly guardando = signal(false);
  readonly errorFoto = signal('');
  readonly error = signal('');

  async tomarFoto(): Promise<void> {
    if (this.tomandoFoto() || this.guardando()) return;

    this.tomandoFoto.set(true);
    this.errorFoto.set('');

    try {
      this.foto.set(await tomarFotoActa());
    } catch (error) {
      this.errorFoto.set(
        error instanceof Error ? error.message : 'No se pudo tomar la foto.',
      );
    } finally {
      this.tomandoFoto.set(false);
    }
  }

  async guardar(evento: Event, formulario: HTMLFormElement): Promise<void> {
    evento.preventDefault();

    if (this.guardando() || this.tomandoFoto()) return;

    this.error.set('');

    const acta = this.acta();
    const datos = new FormData(formulario);

    const leerNumero = (campo: string): number => {
      const valor = datos.get(campo);
      return typeof valor === 'string' && valor.trim() ? Number(valor) : NaN;
    };

    const blancos = leerNumero('blancos');
    const nulos = leerNumero('nulos');
    const sufragantes = leerNumero('sufragantes');
    const motivo = String(datos.get('motivo') ?? '').trim();

    const votos = acta.votos.map((voto) => ({
      candidatura_id: voto.candidatura_id,
      votos: leerNumero(`voto-${voto.candidatura_id}`),
    }));

    const cantidades = [
      blancos,
      nulos,
      sufragantes,
      ...votos.map((voto) => voto.votos),
    ];

    if (
      votos.length !== 5 ||
      !motivo ||
      motivo.length > 500 ||
      cantidades.some(
        (valor) => !Number.isInteger(valor) || valor < 0 || valor > 2_147_483_647,
      )
    ) {
      this.error.set('Completa los votos con enteros válidos e indica el motivo.');
      return;
    }

    const total = votos.reduce((suma, voto) => suma + voto.votos, 0) + blancos + nulos;

    if (total !== sufragantes) {
      this.error.set(
        `Los votos suman ${total}, pero ingresaste ${sufragantes} sufragantes.`,
      );
      return;
    }

    this.guardando.set(true);

    try {
      await corregirActaRecinto({
        numero: acta.numero,
        dignidad: acta.dignidad,
        blancos,
        nulos,
        sufragantes,
        votos,
        motivo,
        foto: this.foto(),
      });

      this.guardada.emit();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo guardar la corrección.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
