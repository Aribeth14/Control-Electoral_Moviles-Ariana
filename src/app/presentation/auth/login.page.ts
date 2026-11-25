import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { AuthService } from '../../core/application/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonButton, IonContent, IonInput],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly perfil = this.auth.perfil;
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  readonly form = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', Validators.required],
  });

  async ingresar(): Promise<void> {
    if (this.cargando()) return;

    this.mensajeError.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const { cedula, password } = this.form.getRawValue();
    this.cargando.set(true);

    try {
      await this.auth.ingresar(cedula, password);
      this.form.controls.password.reset();

      const perfil = this.perfil();

      if (!perfil) {
        throw new Error('No se pudo cargar tu perfil.');
      }

      let destino: string;

      if (perfil.rol === 'provincial') {
        destino = perfil.debe_cambiar_clave ? '/cambiar-clave' : '/provincial';
      } else if (perfil.rol === 'recinto' || perfil.rol === 'veedor') {
        if (!perfil.recinto_id) {
          throw new Error('Tu cuenta no tiene un recinto asignado.');
        }

        const cuentaActiva = perfil.correo_verificado && !perfil.debe_cambiar_clave;

        destino = cuentaActiva ? `/${perfil.rol}` : '/activar-cuenta';
      } else {
        throw new Error('Tu cuenta no tiene un rol habilitado.');
      }

      await this.router.navigateByUrl(destino, { replaceUrl: true });
    } catch (error) {
      this.mensajeError.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      this.cargando.set(false);
    }
  }
}
