import { Component, computed, input, output, signal } from '@angular/core';
import { corregirActaRecinto, type DetalleActaRecinto } from '../../core/infrastructure/actas.repository';
import { tomarFotoActa, type FotoActa } from '../../core/infrastructure/evidencia-acta';

@Component({
  selector: 'app-corregir-acta',
  standalone: true,
  template: `
    <h4>Corregir acta</h4>

    <form #formulario novalidate (input)="actualizarBorrador(formulario)" (submit)="guardar($event, formulario)">
      <p class="ce-step" aria-live="polite">Paso {{ paso() + 1 }} de 3 · {{ pasos[paso()] }}</p>
      <fieldset class="ce-acta-fields" [disabled]="guardando() || tomandoFoto()">
        <div class="ce-acta-block ce-votes" [hidden]="paso() !== 0" role="group" aria-labelledby="votos-corregidos">
          <h3 id="votos-corregidos">Votos</h3>

          @for (voto of acta().votos; track voto.candidatura_id) {
            <p>
              <label>
                {{ voto.nombre }}
                <input
                  type="number"
                  inputmode="numeric"
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
              <input
                type="number"
                inputmode="numeric"
                name="blancos"
                [value]="acta().blancos"
                min="0"
                step="1"
                required
              />
            </label>
          </p>

          <p>
            <label>
              Nulos
              <input type="number" inputmode="numeric" name="nulos" [value]="acta().nulos" min="0" step="1" required />
            </label>
          </p>

          <p class="ce-total">
            <label>
              Total de sufragantes
              <input
                type="number"
                inputmode="numeric"
                name="sufragantes"
                [value]="acta().sufragantes"
                min="0"
                step="1"
                required
              />
            </label>
          </p>
          <div class="ce-calculated">Total calculado: {{ totalCalculado() }}</div>
        </div>
        <p [hidden]="paso() !== 0">
          <label>
            Motivo de la corrección
            <textarea name="motivo" maxlength="500" required></textarea>
          </label>
        </p>

        @if (error() && paso() === 0) {
          <p role="alert">{{ error() }}</p>
        }
        <section class="ce-acta-block" [hidden]="paso() !== 1">
          <h3>Foto del acta</h3>
          <button type="button" (click)="tomarFoto()">
            {{ foto() ? 'Volver a tomar foto' : 'Tomar foto nueva (opcional)' }}
          </button>

          @if (tomandoFoto()) {
            <p role="status">Comprobando la foto…</p>
          }
          @if (errorFoto()) {
            <p role="alert">{{ errorFoto() }}</p>
          }
          @if (foto(); as evidencia) {
            <p>Foto nueva aceptada. Nitidez {{ evidencia.nitidez.toFixed(1) }}.</p>
            <img class="ce-photo-preview" [src]="evidencia.ruta" alt="Foto nueva del acta" width="240" />
          }
        </section>
        <section class="ce-acta-block" [hidden]="paso() !== 2" aria-label="Revisar corrección">
          <h3>Revisar corrección</h3>
          <p>Junta {{ acta().numero }} · {{ acta().dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}</p>
          @if (revision(); as datos) {
            <ul class="ce-review">
              @for (voto of datos.votos; track voto.candidatura_id; let i = $index) {
                <li>
                  {{ acta().votos[i].nombre }} <strong>{{ voto.votos }}</strong>
                </li>
              }
              <li>
                Blancos <strong>{{ datos.blancos }}</strong>
              </li>
              <li>
                Nulos <strong>{{ datos.nulos }}</strong>
              </li>
              <li>
                Total de sufragantes <strong>{{ datos.sufragantes }}</strong>
              </li>
            </ul>
            <p>Motivo: {{ datos.motivo }}</p>
          }
          @if (foto(); as evidencia) {
            <img class="ce-photo-preview" [src]="evidencia.ruta" alt="Vista previa de la foto nueva" width="160" />
            <p>Nitidez: {{ evidencia.nitidez.toFixed(1) }}</p>
          } @else {
            <p>Se conserva la foto existente.</p>
          }
        </section>
        @if (error() && paso() !== 0) {
          <p role="alert">{{ error() }}</p>
        }
        <div class="ce-actions ce-wizard-actions">
          @if (paso() > 0) {
            <button type="button" (click)="retroceder()">Atrás</button>
          }
          @if (paso() < 2) {
            <button type="button" class="ce-primary" (click)="avanzar(formulario)">Siguiente</button>
          } @else {
            <button type="submit">{{ guardando() ? 'Guardando…' : 'Guardar corrección' }}</button>
          }
          <button type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </fieldset>
    </form>
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

  readonly paso = signal(0);
  readonly pasos = ['Votos', 'Evidencia', 'Revisar'];
  readonly ocupado = computed(() => this.tomandoFoto() || this.guardando());
  private readonly editada = signal(false);
  private readonly sumaEditada = signal<number | null>(null);
  readonly revision = signal<ReturnType<CorregirActaComponent['leerFormulario']> | null>(null);
  readonly totalCalculado = computed(
    () =>
      this.sumaEditada() ??
      this.acta().votos.reduce((total, voto) => total + voto.votos, 0) + this.acta().blancos + this.acta().nulos,
  );

  hayCambios(): boolean {
    return this.editada() || Boolean(this.foto());
  }

  actualizarBorrador(formulario: HTMLFormElement): void {
    this.editada.set(true);
    this.error.set('');
    const { votos, blancos, nulos } = this.leerFormulario(formulario);
    this.sumaEditada.set(votos.reduce((total, voto) => total + (voto.votos || 0), 0) + (blancos || 0) + (nulos || 0));
  }

  avanzar(formulario: HTMLFormElement): void {
    this.error.set('');
    const datos = this.validar(formulario);
    if (!datos) return;
    this.revision.set(datos);
    this.paso.update((paso) => Math.min(paso + 1, 2));
  }

  retroceder(): void {
    this.error.set('');
    this.paso.update((paso) => Math.max(paso - 1, 0));
  }

  cancelar(): void {
    if (this.hayCambios() && !window.confirm('¿Descartar los cambios sin guardar?')) return;
    this.cancelada.emit();
  }

  private leerFormulario(formulario: HTMLFormElement) {
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

    return { blancos, nulos, sufragantes, votos, motivo };
  }

  private validar(formulario: HTMLFormElement) {
    const datos = this.leerFormulario(formulario);
    const { blancos, nulos, sufragantes, votos, motivo } = datos;
    const cantidades = [blancos, nulos, sufragantes, ...votos.map((voto) => voto.votos)];

    if (
      votos.length !== 5 ||
      !motivo ||
      motivo.length > 500 ||
      cantidades.some((valor) => !Number.isInteger(valor) || valor < 0 || valor > 2_147_483_647)
    ) {
      this.error.set('Completa los votos con enteros válidos e indica el motivo.');
      return null;
    }

    const total = votos.reduce((suma, voto) => suma + voto.votos, 0) + blancos + nulos;

    if (total !== sufragantes) {
      this.error.set(`Los votos suman ${total}, pero ingresaste ${sufragantes} sufragantes.`);
      return null;
    }

    return datos;
  }

  async tomarFoto(): Promise<void> {
    if (this.tomandoFoto() || this.guardando()) return;

    this.tomandoFoto.set(true);
    this.errorFoto.set('');

    try {
      this.foto.set(await tomarFotoActa());
    } catch (error) {
      this.errorFoto.set(error instanceof Error ? error.message : 'No se pudo tomar la foto.');
    } finally {
      this.tomandoFoto.set(false);
    }
  }

  async guardar(evento: Event, formulario: HTMLFormElement): Promise<void> {
    evento.preventDefault();

    if (this.guardando() || this.tomandoFoto()) return;

    this.error.set('');

    if (this.paso() !== 2) return;
    const datos = this.validar(formulario);
    if (!datos) return;
    const { blancos, nulos, sufragantes, votos, motivo } = datos;
    const acta = this.acta();
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
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar la corrección.');
    } finally {
      this.guardando.set(false);
    }
  }
}
