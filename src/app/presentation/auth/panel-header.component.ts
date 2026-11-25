import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../core/application/auth.service';

@Component({
  selector: 'app-panel-header',
  standalone: true,
  imports: [IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header class="ce-toolbar">
      <ion-toolbar>
        <ion-title>{{ titulo() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button type="button" [disabled]="ocupado() || bloqueado()" (click)="salir()">
            <ion-icon slot="start" [icon]="salida" aria-hidden="true"></ion-icon>
            Cerrar sesión
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      @if (error()) {
        <p class="ce-toolbar-error" role="alert">{{ error() }}</p>
      }
    </ion-header>
  `,
})
export class PanelHeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly titulo = input.required<string>();
  readonly hayCambios = input<() => boolean>(() => false);
  readonly antesDeNavegar = input<() => Promise<unknown>>(async () => {});
  readonly bloqueado = input(false);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly salida = logOutOutline;

  async salir(): Promise<void> {
    if (this.ocupado() || this.bloqueado()) return;
    if (this.hayCambios()() && !window.confirm('¿Cerrar sesión y descartar los cambios sin guardar?')) return;

    this.ocupado.set(true);
    this.error.set('');
    try {
      await this.auth.salir();
      await this.antesDeNavegar()();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
