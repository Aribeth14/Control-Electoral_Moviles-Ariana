import { Component, computed, OnInit, signal } from '@angular/core';
import {
  consultarAvanceProvincial,
  consultarResultadosProvinciales,
  type AvanceRecinto,
  type ResultadosProvinciales,
} from '../../core/infrastructure/provincial.repository';

@Component({
  selector: 'app-resumen-provincial',
  standalone: true,
  template: `
    <h2>Avance de actas por recinto</h2>

    <button type="button" [disabled]="cargando()" (click)="actualizar()">
      Actualizar avance y resultados
    </button>

    @if (cargando()) {
      <p role="status">Cargando datos provinciales…</p>
    }

    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }

    <ul>
      @for (fila of avance(); track fila.recinto_id) {
        <li>
          <strong>{{ fila.recinto }}</strong> · {{ fila.parroquia }}
          <p>
            Alcaldía: {{ fila.alcaldia_reportadas }} de {{ fila.juntas_totales }}
            · Prefectura: {{ fila.prefectura_reportadas }} de {{ fila.juntas_totales }}
          </p>
        </li>
      } @empty {
        @if (!cargando() && !error()) {
          <li>No hay recintos registrados.</li>
        }
      }
    </ul>

    <h2>Resultados por candidatura</h2>

    <label for="filtro-recinto">Recinto</label>
    <select
      id="filtro-recinto"
      #filtro
      [value]="recintoSeleccionado()"
      [disabled]="cargando()"
      (change)="cambiarRecinto(filtro.value)"
    >
      <option value="">Consolidado de todos los recintos</option>
      @for (fila of avance(); track fila.recinto_id) {
        <option [value]="fila.recinto_id">
          {{ fila.recinto }} · {{ fila.parroquia }}
        </option>
      }
    </select>

    @if (resultados(); as datos) {
      <h3>Alcaldía</h3>
      <ul>
        @for (fila of votosAlcaldia(); track fila.id) {
          <li>Lista {{ fila.lista }} · {{ fila.candidato }} · {{ fila.votos }} votos</li>
        }
      </ul>

      <h3>Prefectura</h3>
      <ul>
        @for (fila of votosPrefectura(); track fila.id) {
          <li>Lista {{ fila.lista }} · {{ fila.candidato }} · {{ fila.votos }} votos</li>
        }
      </ul>

      <h3>Ubicación de las actas</h3>
      <ul>
        @for (acta of datos.actas; track acta.id) {
          <li>
            {{ acta.recinto }} · Junta {{ acta.junta }} ·
            {{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}

            @if (acta.latitud !== null && acta.longitud !== null) {
              <p>GPS: {{ acta.latitud }}, {{ acta.longitud }}</p>
            } @else {
              <p>Sin ubicación registrada.</p>
            }
          </li>
        } @empty {
          <li>Todavía no hay actas para este filtro.</li>
        }
      </ul>
    }
  `,
})
export class ResumenProvincialComponent implements OnInit {
  readonly avance = signal<AvanceRecinto[]>([]);
  readonly recintoSeleccionado = signal('');
  readonly resultados = signal<ResultadosProvinciales | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly votosAlcaldia = computed(() =>
    this.resultados()?.votos.filter((fila) => fila.dignidad === 'alcaldia') ?? [],
  );

  readonly votosPrefectura = computed(() =>
    this.resultados()?.votos.filter((fila) => fila.dignidad === 'prefectura') ?? [],
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

    try {
      if (actualizarAvance) {
        const avance = await consultarAvanceProvincial();
        this.avance.set(avance);

        if (!avance.some((fila) => fila.recinto_id === this.recintoSeleccionado())) {
          this.recintoSeleccionado.set('');
        }
      }

      const datos = await consultarResultadosProvinciales(
        this.recintoSeleccionado() || null,
      );
      this.resultados.set(datos);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudieron cargar los resultados.',
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
