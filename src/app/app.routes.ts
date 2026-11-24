import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { AuthService } from './core/application/auth.service';

type RutaProtegida = 'cambiar-clave' | 'provincial' | 'activar-cuenta' | 'recinto' |'veedor';

function protegerAcceso(destino: RutaProtegida): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    try {
      const perfil = await auth.recuperarPerfil();

      if (!perfil) {
        return router.createUrlTree(['/login']);
      }

      let rutaPermitida: RutaProtegida;

      if (perfil.rol === 'provincial') {
        rutaPermitida = perfil.debe_cambiar_clave ? 'cambiar-clave' : 'provincial';
      } else if (
        (perfil.rol === 'recinto' || perfil.rol === 'veedor') &&
        perfil.recinto_id
      ) {
        const cuentaActiva = perfil.correo_verificado && !perfil.debe_cambiar_clave;
        rutaPermitida = cuentaActiva ? perfil.rol : 'activar-cuenta';
      } else {
        return router.createUrlTree(['/login']);
      }

      return destino === rutaPermitida
        ? true
        : router.createUrlTree([`/${rutaPermitida}`]);
    } catch {
      return router.createUrlTree(['/login']);
    }
  };
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () =>
      import('./presentation/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'recuperar-clave',
    loadComponent: () =>
      import('./presentation/auth/recuperar-clave.page').then((m) => m.RecuperarClavePage),
  },
  {
    path: 'cambiar-clave',
    canActivate: [protegerAcceso('cambiar-clave')],
    loadComponent: () =>
      import('./presentation/auth/cambiar-clave.page').then((m) => m.CambiarClavePage),
  },
  {
    path: 'provincial',
    canActivate: [protegerAcceso('provincial')],
    loadComponent: () =>
      import('./presentation/auth/panel-provincial.page').then((m) => m.PanelProvincialPage),
  },
  {
    path: 'activar-cuenta',
    canActivate: [protegerAcceso('activar-cuenta')],
    loadComponent: () =>
      import('./presentation/auth/activar-cuenta.page').then((m) => m.ActivarCuentaPage),
  },
  {
    path: 'recinto',
    canActivate: [protegerAcceso('recinto')],
    loadComponent: () =>
      import('./presentation/auth/panel-recinto.page').then((m) => m.PanelRecintoPage),
  },
  {
    path: 'veedor',
    canActivate: [protegerAcceso('veedor')],
    loadComponent: () =>
      import('./presentation/auth/panel-veedor.page').then((m) => m.PanelVeedorPage),
  },
];