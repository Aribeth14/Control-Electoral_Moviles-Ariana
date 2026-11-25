import { Component } from '@angular/core';

@Component({
  selector: 'app-electoral-brand',
  standalone: true,
  template: `
    <header class="ce-brand">
      <svg
        class="ce-urn"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M9 33h46v24H9z M9 33l6-9h9m19 0h6l6 9M21 33h22" />
        <path d="m24 13 16-6 9 23M24 13l7 20m-1-15 8-3m-6 8 8-3" />
      </svg>
      <span class="ce-urn-base" aria-hidden="true"></span>
      <p>Control Electoral</p>
    </header>
  `,
})
export class ElectoralBrandComponent {}
