import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { registrarActa } from '../../core/infrastructure/actas.repository';
import { listarCandidaturas, type Dignidad } from '../../core/infrastructure/candidaturas.repository';
import { obtenerUbicacionActa, tomarFotoActa, type FotoActa } from '../../core/infrastructure/evidencia-acta';

interface CandidaturaActa {
  id: number;
  nombre_candidato: string;
}

@Component({
  selector: 'app-registrar-acta',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h2>Registrar acta · Junta {{ numeroJunta() }}</h2>

    <label [hidden]="paso() !== 0" for="dignidad-acta">Dignidad</label>
    <select
      [hidden]="paso() !== 0"
      id="dignidad-acta"
      #selector
      [value]="dignidad() ?? ''"
      [disabled]="ocupado()"
      (change)="cambiarDignidad(selector)"
    >
      <option value="">Selecciona una dignidad</option>
      <option value="alcaldia">Alcaldía</option>
      <option value="prefectura">Prefectura</option>
    </select>

    @if (cargando()) {
      <p role="status">Cargando candidaturas…</p>
    }

    @if (candidaturas().length === 5) {
      <form [formGroup]="form" (ngSubmit)="guardarActa()" (input)="limpiarMensajes()" novalidate>
        <p class="ce-step" aria-live="polite">Paso {{ paso() + 1 }} de 3 · {{ pasos[paso()] }}</p>
        <fieldset class="ce-acta-fields" [disabled]="ocupado()">
          <div class="ce-acta-block ce-votes" [hidden]="paso() !== 0" role="group" aria-labelledby="votos-acta">
            <h3 id="votos-acta">Votos y total de sufragantes</h3>

            <div formArrayName="votos">
              @for (candidatura of candidaturas(); track candidatura.id; let i = $index) {
                <p>
                  <label [for]="'votos-' + candidatura.id">
                    {{ candidatura.nombre_candidato }}
                  </label>
                  <input
                    [id]="'votos-' + candidatura.id"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    [formControlName]="i"
                  />
                </p>
              }
            </div>

            <p>
              <label for="blancos-acta">Votos blancos</label>
              <input id="blancos-acta" type="number" min="0" step="1" inputmode="numeric" formControlName="blancos" />
            </p>

            <p>
              <label for="nulos-acta">Votos nulos</label>
              <input id="nulos-acta" type="number" min="0" step="1" inputmode="numeric" formControlName="nulos" />
            </p>

            <p class="ce-total">
              <label for="sufragantes-acta">Total de sufragantes</label>
              <input
                id="sufragantes-acta"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                formControlName="sufragantes"
              />
            </p>
            <div class="ce-calculated">Total calculado: {{ totalCalculado() }}</div>
            @if (error() && paso() === 0) {
              <p class="ce-field-error" role="alert">{{ error() }}</p>
            }
          </div>
          <section class="ce-acta-block" [hidden]="paso() !== 1">
            <h3>Foto del acta</h3>
            <p>
              <button type="button" (click)="tomarFoto()">
                {{ foto() ? 'Volver a tomar foto' : 'Tomar foto' }}
              </button>
            </p>

            @if (tomandoFoto()) {
              <p role="status">Tomando foto y comprobando la nitidez…</p>
            }

            @if (errorFoto()) {
              <p role="alert">{{ errorFoto() }}</p>
            }

            @if (foto(); as evidencia) {
              <p>Foto aceptada. Nitidez: {{ evidencia.nitidez.toFixed(1) }}</p>
              <img class="ce-photo-preview" [src]="evidencia.ruta" alt="Vista previa del acta aceptada" width="240" />
            }
          </section>
          <section class="ce-acta-block" [hidden]="paso() !== 1">
            <h3>Ubicación del acta</h3>
            <p>
              <button type="button" (click)="obtenerUbicacion()">
                {{ ubicacion() ? 'Actualizar ubicación' : 'Obtener ubicación' }}
              </button>
            </p>

            @if (obteniendoUbicacion()) {
              <p role="status">Obteniendo ubicación…</p>
            }

            @if (errorUbicacion()) {
              <p role="alert">{{ errorUbicacion() }}</p>
            }

            @if (ubicacion(); as gps) {
              <p role="status">
                Latitud {{ gps.latitud.toFixed(6) }} · Longitud {{ gps.longitud.toFixed(6) }} · Precisión
                {{ gps.precision.toFixed(0) }} m
              </p>

              @if (gps.precision > 50) {
                <p>La precisión supera los 50 m. Puedes volver a obtener la ubicación.</p>
              }
            }
          </section>
          <section class="ce-acta-block" [hidden]="paso() !== 2" aria-label="Revisar acta">
            <h3>Revisar acta</h3>
            <p>{{ dignidad() === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }} · Junta {{ numeroJunta() }}</p>
            <ul class="ce-review">
              @for (candidatura of candidaturas(); track candidatura.id; let i = $index) {
                <li>
                  {{ candidatura.nombre_candidato }} <strong>{{ form.controls.votos.at(i).value }}</strong>
                </li>
              }
              <li>
                Blancos <strong>{{ form.controls.blancos.value }}</strong>
              </li>
              <li>
                Nulos <strong>{{ form.controls.nulos.value }}</strong>
              </li>
              <li>
                Total de sufragantes <strong>{{ totalCalculado() }}</strong>
              </li>
            </ul>
            @if (foto(); as evidencia) {
              <img class="ce-photo-preview" [src]="evidencia.ruta" alt="Vista previa del acta" width="160" />
              <p>Nitidez: {{ evidencia.nitidez.toFixed(1) }}</p>
            }
            @if (ubicacion(); as gps) {
              <p>GPS: {{ gps.latitud.toFixed(6) }}, {{ gps.longitud.toFixed(6) }}</p>
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
              <button type="button" class="ce-primary" (click)="avanzar()">Siguiente</button>
            } @else {
              <button type="submit">{{ guardando() ? 'Guardando…' : 'Guardar acta' }}</button>
            }
          </div>
        </fieldset>
      </form>
    }

    @if (error() && candidaturas().length !== 5) {
      <p role="alert">{{ error() }}</p>
    }

    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
  `,
})
export class RegistrarActaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly validadores = [Validators.required, Validators.min(0), Validators.max(2_147_483_647)];

  readonly paso = signal(0);
  readonly pasos = ['Votos', 'Evidencia', 'Revisar'];
  readonly guardada = output<void>();

  hayCambios(): boolean {
    return this.form.dirty || Boolean(this.foto() || this.ubicacion());
  }

  totalCalculado(): number {
    const { votos, blancos, nulos } = this.form.getRawValue();
    return votos.reduce<number>((total, voto) => total + (voto ?? 0), 0) + (blancos ?? 0) + (nulos ?? 0);
  }

  cambiarDignidad(selector: HTMLSelectElement): void {
    if (this.hayCambios() && !window.confirm('¿Cambiar de dignidad y descartar los datos ingresados?')) {
      selector.value = this.dignidad() ?? '';
      return;
    }
    void this.elegirDignidad(selector.value);
  }

  avanzar(): void {
    this.error.set('');
    if (this.paso() === 0 && !this.validarVotos()) return;
    if (this.paso() === 1 && !this.validarEvidencia()) return;
    this.paso.update((paso) => Math.min(paso + 1, 2));
  }

  retroceder(): void {
    this.error.set('');
    this.paso.update((paso) => Math.max(paso - 1, 0));
  }

  readonly numeroJunta = input.required<number>();
  readonly dignidad = signal<Dignidad | null>(null);
  readonly candidaturas = signal<CandidaturaActa[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  readonly foto = signal<FotoActa | null>(null);
  readonly tomandoFoto = signal(false);
  readonly errorFoto = signal('');

  readonly ubicacion = signal<Awaited<ReturnType<typeof obtenerUbicacionActa>> | null>(null);
  readonly obteniendoUbicacion = signal(false);
  readonly errorUbicacion = signal('');

  readonly ocupado = computed(
    () => this.cargando() || this.guardando() || this.tomandoFoto() || this.obteniendoUbicacion(),
  );

  readonly form = this.fb.group({
    votos: this.fb.array(Array.from({ length: 5 }, () => this.fb.control<number | null>(null, this.validadores))),
    blancos: this.fb.control<number | null>(null, this.validadores),
    nulos: this.fb.control<number | null>(null, this.validadores),
    sufragantes: this.fb.control<number | null>(null, this.validadores),
  });

  async elegirDignidad(valor: string): Promise<void> {
    if (this.ocupado()) return;

    this.limpiarMensajes();
    this.dignidad.set(null);
    this.candidaturas.set([]);
    this.reiniciarDatosActa();

    if (valor !== 'alcaldia' && valor !== 'prefectura') return;

    this.cargando.set(true);

    try {
      const candidaturas = await listarCandidaturas(valor);

      if (candidaturas.length !== 5) {
        this.error.set('Esta dignidad debe tener exactamente cinco candidaturas.');
        return;
      }

      this.candidaturas.set(candidaturas);
      this.dignidad.set(valor);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.');
    } finally {
      this.cargando.set(false);
    }
  }

  async tomarFoto(): Promise<void> {
    if (this.ocupado()) return;

    this.limpiarMensajes();
    this.tomandoFoto.set(true);
    this.errorFoto.set('');
    this.foto.set(null);

    try {
      this.foto.set(await tomarFotoActa());
    } catch (error) {
      this.errorFoto.set(error instanceof Error ? error.message : 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      this.tomandoFoto.set(false);
    }
  }

  async obtenerUbicacion(): Promise<void> {
    if (this.ocupado()) return;

    this.limpiarMensajes();
    this.obteniendoUbicacion.set(true);
    this.errorUbicacion.set('');
    this.ubicacion.set(null);

    try {
      this.ubicacion.set(await obtenerUbicacionActa());
    } catch (error) {
      this.errorUbicacion.set(
        error instanceof Error ? error.message : 'No se pudo obtener la ubicación. Intenta de nuevo.',
      );
    } finally {
      this.obteniendoUbicacion.set(false);
    }
  }

  async guardarActa(): Promise<void> {
    if (this.ocupado()) return;

    this.limpiarMensajes();
    if (this.paso() !== 2) return;
    const datos = this.validarVotos();
    if (!datos) return;
    const evidencia = this.validarEvidencia();
    if (!evidencia) return;
    const { dignidad, candidaturas, votosValidos, blancos, nulos, sufragantes } = datos;
    const { foto, ubicacion } = evidencia;

    this.guardando.set(true);

    try {
      await registrarActa({
        numeroJunta: this.numeroJunta(),
        dignidad,
        blancos,
        nulos,
        sufragantes,
        foto,
        ubicacion,
        votos: candidaturas.map((candidatura, indice) => ({
          candidatura_id: candidatura.id,
          votos: votosValidos[indice],
        })),
      });

      this.reiniciarDatosActa();
      this.mensaje.set('Acta guardada con votos, foto y ubicación.');
      this.guardada.emit();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el acta.');
    } finally {
      this.guardando.set(false);
    }
  }

  private validarVotos() {
    this.form.markAllAsTouched();

    const dignidad = this.dignidad();
    const candidaturas = this.candidaturas();
    const { votos, blancos, nulos, sufragantes } = this.form.getRawValue();

    if (!dignidad || candidaturas.length !== 5) {
      this.error.set('Selecciona una dignidad y carga sus candidaturas.');
      return null;
    }

    const votosValidos = votos.filter((voto): voto is number => voto !== null && Number.isInteger(voto));

    if (
      this.form.invalid ||
      votosValidos.length !== candidaturas.length ||
      blancos === null ||
      nulos === null ||
      sufragantes === null ||
      ![blancos, nulos, sufragantes].every(Number.isInteger)
    ) {
      this.error.set('Completa todos los campos con números enteros válidos.');
      return null;
    }

    const totalCalculado = votosValidos.reduce((total, voto) => total + voto, 0) + blancos + nulos;

    if (totalCalculado !== sufragantes) {
      this.error.set(`Los votos suman ${totalCalculado} y registraste ${sufragantes} sufragantes.`);
      return null;
    }

    return { dignidad, candidaturas, votosValidos, blancos, nulos, sufragantes };
  }

  private validarEvidencia() {
    const foto = this.foto();
    const ubicacion = this.ubicacion();
    if (!foto || !ubicacion) {
      this.error.set('Toma una foto nítida y obtén la ubicación antes de continuar.');
      return null;
    }
    return { foto, ubicacion };
  }

  limpiarMensajes(): void {
    this.error.set('');
    this.mensaje.set('');
  }

  private reiniciarDatosActa(): void {
    this.paso.set(0);
    this.form.reset();
    this.foto.set(null);
    this.errorFoto.set('');
    this.ubicacion.set(null);
    this.errorUbicacion.set('');
  }
}
