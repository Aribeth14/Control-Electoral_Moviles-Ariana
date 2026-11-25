import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import {
  guardarClaveRecuperada,
  solicitarCodigoRecuperacion,
  verificarCodigoRecuperacion,
} from '../../core/infrastructure/auth.gateway';

import { ElectoralBrandComponent } from './electoral-brand.component';

@Component({
  selector: 'app-recuperar-clave',
  standalone: true,
  imports: [ElectoralBrandComponent, ReactiveFormsModule, RouterLink, IonButton, IonContent, IonInput],
  template: `
    <ion-content class="ce-auth">
      <app-electoral-brand></app-electoral-brand>
      <main class="ce-auth-card">
        <h1>Recuperar contraseña</h1>

        @if (paso() === 'listo') {
          <p role="status">Contraseña actualizada. Ya puedes ingresar con tu cédula.</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="continuar()">
            @switch (paso()) {
              @case ('correo') {
                <ion-input
                  label="Correo registrado"
                  labelPlacement="stacked"
                  type="email"
                  autocomplete="email"
                  formControlName="correo"
                ></ion-input>
              }
              @case ('codigo') {
                <p>Si el correo está registrado, recibirás un código de recuperación.</p>
                <ion-input
                  label="Código del correo"
                  labelPlacement="stacked"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  formControlName="codigo"
                ></ion-input>
              }
              @case ('clave') {
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
              }
            }

            @if (mensaje()) {
              <p role="alert">{{ mensaje() }}</p>
            }

            <ion-button expand="block" type="submit" [disabled]="ocupado()">
              {{ ocupado() ? 'Procesando…' : etiquetas[paso()] }}
            </ion-button>
          </form>
        }

        <a routerLink="/login">Volver al inicio de sesión</a>
      </main>
    </ion-content>
  `,
})
export class RecuperarClavePage {
  private readonly fb = inject(FormBuilder);
  private correoSolicitado = '';

  readonly paso = signal<'correo' | 'codigo' | 'clave' | 'listo'>('correo');
  readonly ocupado = signal(false);
  readonly mensaje = signal('');

  readonly etiquetas = {
    correo: 'Enviar código',
    codigo: 'Verificar código',
    clave: 'Guardar contraseña',
    listo: '',
  };

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    clave: ['', [Validators.required, Validators.minLength(10)]],
    confirmacion: ['', Validators.required],
  });

  async continuar(): Promise<void> {
    if (this.ocupado()) return;

    this.mensaje.set('');
    this.ocupado.set(true);
    const { correo, codigo, clave, confirmacion } = this.form.getRawValue();

    try {
      switch (this.paso()) {
        case 'correo':
          if (this.form.controls.correo.invalid) {
            this.mensaje.set('Ingresa un correo válido.');
            return;
          }

          this.correoSolicitado = correo.trim();
          await solicitarCodigoRecuperacion(this.correoSolicitado);
          this.paso.set('codigo');
          break;

        case 'codigo':
          if (this.form.controls.codigo.invalid) {
            this.mensaje.set('Escribe el código numérico que recibiste.');
            return;
          }

          await verificarCodigoRecuperacion(this.correoSolicitado, codigo.trim());
          this.form.controls.codigo.reset();
          this.paso.set('clave');
          break;

        case 'clave':
          if (this.form.controls.clave.invalid || clave !== confirmacion) {
            this.mensaje.set('Escribe al menos 10 caracteres y confirma la misma contraseña.');
            return;
          }

          await guardarClaveRecuperada(clave);
          this.form.reset();
          this.paso.set('listo');
          break;
      }
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo completar la recuperación.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
