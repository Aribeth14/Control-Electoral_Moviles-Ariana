import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, IonButton, IonContent, IonInput],
  template: `
    <ion-content class="ion-padding">
      <h1>Activar cuenta</h1>

      @if (activada()) {
        <p role="status">Cuenta activada. Ingresa con tu cédula y la nueva contraseña.</p>
        <ion-button type="button" [disabled]="ocupado()" (click)="volverAlLogin()">
          Volver al inicio de sesión
        </ion-button>
      } @else {
        <p>Solicita un código al correo registrado para tu cuenta.</p>

        <ion-button type="button" [disabled]="ocupado()" (click)="enviarCodigo()">
          {{ codigoEnviado() ? 'Solicitar otro código' : 'Enviar código' }}
        </ion-button>

        @if (codigoEnviado()) {
          <p role="status">Revisa tu correo y la carpeta de Spam.</p>

          <form [formGroup]="form" (ngSubmit)="confirmar()">
            <ion-input
              label="Código de 8 dígitos"
              labelPlacement="stacked"
              type="text"
              inputmode="numeric"
              maxlength="8"
              autocomplete="one-time-code"
              formControlName="codigo"
            ></ion-input>

            <ion-input
              label="Nueva contraseña"
              labelPlacement="stacked"
              type="password"
              autocomplete="new-password"
              formControlName="clave"
            ></ion-input>

            <ion-input
              label="Confirma la contraseña"
              labelPlacement="stacked"
              type="password"
              autocomplete="new-password"
              formControlName="confirmacion"
            ></ion-input>

            <ion-button type="submit" expand="block" [disabled]="ocupado()">
              {{ ocupado() ? 'Procesando…' : 'Activar cuenta' }}
            </ion-button>
          </form>
        }
      }

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
    </ion-content>
  `,
})
export class ActivarCuentaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly ocupado = signal(false);
  readonly codigoEnviado = signal(false);
  readonly activada = signal(false);
  readonly error = signal('');

  readonly form = inject(FormBuilder).nonNullable.group({
    codigo: '',
    clave: '',
    confirmacion: '',
  });

  async enviarCodigo(): Promise<void> {
    await this.ejecutar(async () => {
      await this.auth.solicitarCodigoActivacion();
      this.form.controls.codigo.reset();
      this.codigoEnviado.set(true);
    });
  }

  async confirmar(): Promise<void> {
    if (this.ocupado()) return;

    const { codigo, clave, confirmacion } = this.form.getRawValue();
    const codigoLimpio = codigo.trim();

    if (!/^[0-9]{8}$/.test(codigoLimpio)) {
      this.error.set('Escribe los 8 dígitos del código.');
      return;
    }

    if (clave.length < 8 || clave === 'Ecuador2026' || clave !== confirmacion) {
      this.error.set(
        'Usa una clave distinta de la temporal, de al menos 8 caracteres, y confírmala.',
      );
      return;
    }

    await this.ejecutar(async () => {
      await this.auth.confirmarActivacion(codigoLimpio, clave);
      this.form.reset();
      this.activada.set(true);
    });
  }

  async volverAlLogin(): Promise<void> {
    await this.ejecutar(async () => {
      await this.auth.salir();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;

    this.ocupado.set(true);
    this.error.set('');

    try {
      await accion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      this.ocupado.set(false);
    }
  }
}