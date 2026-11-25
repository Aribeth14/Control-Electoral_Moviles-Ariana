import { Component, input, output, viewChild } from '@angular/core';
import { IonButton, IonContent, IonModal } from '@ionic/angular';
import { PanelHeaderComponent } from './panel-header.component';

@Component({
  selector: 'app-panel-modal',
  standalone: true,
  imports: [IonButton, IonContent, IonModal, PanelHeaderComponent],
  template: `
    <ion-modal
      [isOpen]="abierto()"
      [attr.aria-label]="titulo()"
      [canDismiss]="puedeCerrar"
      (didDismiss)="cerrado.emit()"
    >
      <ng-template>
        <app-panel-header
          [titulo]="titulo()"
          [hayCambios]="hayCambios()"
          [bloqueado]="bloqueado()"
          [antesDeNavegar]="cerrarPorSalida"
        ></app-panel-header>
        <ion-content class="ce-panel">
          <div class="ce-main ce-modal-body">
            <ion-button class="ce-modal-close" fill="outline" type="button" [disabled]="bloqueado()" (click)="cerrar()"
              >Cerrar</ion-button
            >
            <ng-content></ng-content>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
})
export class PanelModalComponent {
  private readonly modal = viewChild.required(IonModal);

  readonly abierto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly hayCambios = input<() => boolean>(() => false);
  readonly bloqueado = input(false);
  readonly cerrado = output<void>();

  readonly puedeCerrar = async (_datos?: unknown, rol?: string): Promise<boolean> =>
    rol === 'salida' ||
    (!this.bloqueado() && (!this.hayCambios()() || window.confirm('¿Descartar los cambios sin guardar?')));

  readonly cerrarPorSalida = () => this.modal().dismiss(undefined, 'salida');

  cerrar(): void {
    void this.modal().dismiss();
  }
}
