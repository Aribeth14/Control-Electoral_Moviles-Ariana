import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './core/application/auth.service';

function protegerAcceso(destino: 'cambiar-clave' | 'provincial'): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    try {
      const perfil = await auth.recuperarPerfil();

      if (!perfil) return router.createUrlTree(['/login']);

      if (perfil.debe_cambiar_clave) {
        return destino === 'cambiar-clave'
          ? true
          : router.createUrlTree(['/cambiar-clave']);
      }

      if (destino === 'provincial') {
        return perfil.rol === 'provincial'
          ? true
          : router.createUrlTree(['/login']);
      }

      return router.createUrlTree([perfil.rol === 'provincial' ? '/provincial' : '/login']);
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
  path: 'recuperar-clave',
  loadComponent: () =>
    import('./presentation/auth/recuperar-clave.page')
      .then((m) => m.RecuperarClavePage),
},
];
