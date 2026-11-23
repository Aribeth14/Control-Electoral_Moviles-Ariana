import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';

@Component({
  standalone: true,
  imports: [IonContent],
  template: `
    <ion-content class="ion-padding">
      <h1>Panel provincial</h1>
      <p>Acceso habilitado.</p>
    </ion-content>
  `,
})
export class PanelProvincialPage {}