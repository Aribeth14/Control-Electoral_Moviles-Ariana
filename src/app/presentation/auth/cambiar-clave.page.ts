import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';

@Component({
  selector: 'app-cambiar-clave',
  standalone: true,
  imports: [ReactiveFormsModule, IonButton, IonContent, IonInput],
  template: `
    <ion-content class="ion-padding">
      <h1>Cambiar contraseña</h1>
      <p>Antes de continuar, elige una contraseña nueva de al menos 10 caracteres.</p>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <ion-input
          label="Nueva contraseña"
          labelPlacement="stacked"
          type="password"
          autocomplete="new-password"
          formControlName="nueva"
        ></ion-input>

        <ion-input
          label="Confirma la contraseña"
          labelPlacement="stacked"
          type="password"
          autocomplete="new-password"
          formControlName="confirmacion"
        ></ion-input>

        @if (mensaje()) {
          <p role="alert">{{ mensaje() }}</p>
        }

        <ion-button expand="block" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar contraseña' }}
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class CambiarClavePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly mensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    nueva: ['', [Validators.required, Validators.minLength(10)]],
    confirmacion: ['', Validators.required],
  });

  async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.mensaje.set('');
    const { nueva, confirmacion } = this.form.getRawValue();

    if (this.form.invalid) {
      this.mensaje.set('Completa ambos campos. La clave debe tener al menos 10 caracteres.');
      return;
    }

    if (nueva !== confirmacion) {
      this.mensaje.set('Las contraseñas no coinciden.');
      return;
    }

    this.guardando.set(true);

    try {
      await this.auth.cambiarClave(nueva);
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo guardar la clave.');
      this.guardando.set(false);
      return;
    }

    this.form.reset();

    try {
      const entro = await this.router.navigateByUrl('/provincial', { replaceUrl: true });
      if (!entro) {
        this.mensaje.set('La contraseña se guardó. Recarga la app para continuar con la nueva clave.');
      }
    } catch {
      this.mensaje.set('La contraseña se guardó. Recarga la app para continuar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
