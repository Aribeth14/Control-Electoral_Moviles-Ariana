import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { registrarActa } from '../../core/infrastructure/actas.repository';
import {
  listarCandidaturas,
  type Dignidad,
} from '../../core/infrastructure/candidaturas.repository';

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

    <label for="dignidad-acta">Dignidad</label>
    <select
      id="dignidad-acta"
      #selector
      [disabled]="cargando() || guardando()"
      (change)="elegirDignidad(selector.value)"
    >
      <option value="">Selecciona una dignidad</option>
      <option value="alcaldia">Alcaldía</option>
      <option value="prefectura">Prefectura</option>
    </select>

    @if (cargando()) {
      <p role="status">Cargando candidaturas…</p>
    }

    @if (candidaturas().length === 5) {
      <form
        [formGroup]="form"
        (ngSubmit)="guardarActa()"
        (input)="limpiarMensajes()"
        novalidate
      >
        <fieldset [disabled]="guardando()">
          <legend>Votos y total de sufragantes</legend>

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
            <input
              id="blancos-acta"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              formControlName="blancos"
            />
          </p>

          <p>
            <label for="nulos-acta">Votos nulos</label>
            <input
              id="nulos-acta"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              formControlName="nulos"
            />
          </p>

          <p>
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

          <button type="submit">
            {{ guardando() ? 'Guardando…' : 'Guardar acta' }}
          </button>
        </fieldset>
      </form>
    }

    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }

    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
  `,
})
export class RegistrarActaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly validadores = [
    Validators.required,
    Validators.min(0),
    Validators.max(2_147_483_647),
  ];

  readonly numeroJunta = input.required<number>();
  readonly dignidad = signal<Dignidad | null>(null);
  readonly candidaturas = signal<CandidaturaActa[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  readonly form = this.fb.group({
    votos: this.fb.array(
      Array.from({ length: 5 }, () =>
        this.fb.control<number | null>(null, this.validadores),
      ),
    ),
    blancos: this.fb.control<number | null>(null, this.validadores),
    nulos: this.fb.control<number | null>(null, this.validadores),
    sufragantes: this.fb.control<number | null>(null, this.validadores),
  });

  async elegirDignidad(valor: string): Promise<void> {
    if (this.cargando() || this.guardando()) return;

    this.limpiarMensajes();
    this.dignidad.set(null);
    this.candidaturas.set([]);
    this.form.reset();

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
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo cargar el catálogo.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarActa(): Promise<void> {
    if (this.cargando() || this.guardando()) return;

    this.limpiarMensajes();
    this.form.markAllAsTouched();

    const dignidad = this.dignidad();
    const candidaturas = this.candidaturas();
    const { votos, blancos, nulos, sufragantes } = this.form.getRawValue();

    if (!dignidad || candidaturas.length !== 5) {
      this.error.set('Selecciona una dignidad y carga sus candidaturas.');
      return;
    }

    const votosValidos = votos.filter(
      (voto): voto is number => voto !== null && Number.isInteger(voto),
    );

    if (
      this.form.invalid ||
      votosValidos.length !== candidaturas.length ||
      blancos === null ||
      nulos === null ||
      sufragantes === null ||
      ![blancos, nulos, sufragantes].every(Number.isInteger)
    ) {
      this.error.set('Completa todos los campos con números enteros válidos.');
      return;
    }

    const totalCalculado =
      votosValidos.reduce((total, voto) => total + voto, 0) + blancos + nulos;

    if (totalCalculado !== sufragantes) {
      this.error.set(
        `Los votos suman ${totalCalculado} y registraste ${sufragantes} sufragantes.`,
      );
      return;
    }

    this.guardando.set(true);

    try {
      await registrarActa({
        numeroJunta: this.numeroJunta(),
        dignidad,
        blancos,
        nulos,
        sufragantes,
        votos: candidaturas.map((candidatura, indice) => ({
          candidatura_id: candidatura.id,
          votos: votosValidos[indice],
        })),
      });

      this.form.reset();
      this.mensaje.set('Acta guardada correctamente.');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo guardar el acta.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  limpiarMensajes(): void {
    this.error.set('');
    this.mensaje.set('');
  }
}
