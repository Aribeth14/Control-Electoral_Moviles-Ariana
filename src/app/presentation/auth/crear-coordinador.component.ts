import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonInput, IonSelect, IonSelectOption } from '@ionic/angular';
import type { Recinto } from '../../core/infrastructure/recintos.repository';
import { crearCoordinador } from '../../core/infrastructure/usuarios.repository';

@Component({
  selector: 'app-crear-coordinador',
  standalone: true,
  imports: [ReactiveFormsModule, IonButton, IonInput, IonSelect, IonSelectOption],
  template: `
    <h2>Crear {{ tipo() === 'veedor' ? 'veedor' : 'coordinador de recinto' }}</h2>

    <form [formGroup]="form" (ngSubmit)="guardar()">
      <ion-select
        label="Recinto"
        labelPlacement="stacked"
        placeholder="Selecciona un recinto"
        interface="popover"
        formControlName="recinto_id"
      >
        @for (recinto of recintos(); track recinto.id) {
          <ion-select-option [value]="recinto.id"> {{ recinto.nombre }} · {{ recinto.parroquia }} </ion-select-option>
        }
      </ion-select>

      <ion-input label="Nombres" labelPlacement="stacked" formControlName="nombres"></ion-input>

      <ion-input label="Apellidos" labelPlacement="stacked" formControlName="apellidos"></ion-input>

      <ion-input
        label="Cédula"
        labelPlacement="stacked"
        type="text"
        inputmode="numeric"
        maxlength="10"
        formControlName="cedula"
      ></ion-input>

      <ion-input
        label="Teléfono celular"
        labelPlacement="stacked"
        type="tel"
        maxlength="10"
        formControlName="telefono"
      ></ion-input>

      <ion-input label="Correo electrónico" labelPlacement="stacked" type="email" formControlName="correo"></ion-input>

      <ion-button type="submit" expand="block" [disabled]="guardando() || recintos().length === 0">
        {{ guardando() ? 'Creando cuenta…' : 'Crear ' + tipo() }}
      </ion-button>

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      @if (mensaje()) {
        <p role="status">{{ mensaje() }}</p>
      }
    </form>
  `,
})
export class CrearCoordinadorComponent {
  private readonly fb = inject(FormBuilder);

  readonly recintos = input.required<readonly Recinto[]>();
  readonly tipo = input<'coordinador' | 'veedor'>('coordinador');

  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    recinto_id: ['', Validators.required],
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    cedula: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^09[0-9]{8}$/)]],
    correo: ['', [Validators.required, Validators.email]],
  });

  async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.error.set('');
    this.mensaje.set('');
    this.form.markAllAsTouched();

    const datos = this.form.getRawValue();
    const nombres = datos.nombres.trim();
    const apellidos = datos.apellidos.trim();

    if (this.form.invalid || !nombres || !apellidos) {
      this.error.set(
        'Selecciona un recinto y completa los datos. Usa 10 dígitos para la cédula y un celular que empiece en 09.',
      );
      return;
    }

    if (!this.recintos().some((recinto) => recinto.id === datos.recinto_id)) {
      this.error.set('Selecciona un recinto de la lista.');
      return;
    }

    this.guardando.set(true);

    try {
      const resultado = await crearCoordinador({
        ...datos,
        nombres,
        apellidos,
        correo: datos.correo.trim().toLowerCase(),
      });

      this.form.reset();
      this.mensaje.set(resultado.mensaje);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      this.guardando.set(false);
    }
  }
}
