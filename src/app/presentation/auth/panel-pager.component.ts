import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular';

export const FILAS_POR_PAGINA = 4;

@Component({
  selector: 'app-panel-pager',
  standalone: true,
  imports: [IonButton],
  template: `
    @if (total() > tamano) {
      <nav class="ce-pager" aria-label="Paginación">
        <ion-button
          type="button"
          size="small"
          fill="outline"
          [disabled]="pagina() === 0"
          (click)="cambio.emit(pagina() - 1)"
          >Anterior</ion-button
        >
        <span aria-live="polite">{{ pagina() + 1 }} de {{ paginas() }}</span>
        <ion-button
          type="button"
          size="small"
          fill="outline"
          [disabled]="pagina() + 1 >= paginas()"
          (click)="cambio.emit(pagina() + 1)"
          >Siguiente</ion-button
        >
      </nav>
    }
  `,
})
export class PanelPagerComponent {
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly cambio = output<number>();
  readonly tamano = FILAS_POR_PAGINA;

  paginas(): number {
    return Math.ceil(this.total() / this.tamano);
  }
}
