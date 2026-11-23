import { Injectable, signal } from '@angular/core';
import {
  actualizarClave,
  autenticarConCedula,
  cargarPerfilDeSesion,
} from '../infrastructure/auth.gateway';

type Perfil = Awaited<ReturnType<typeof autenticarConCedula>>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly perfilActual = signal<Perfil | null>(null);
  readonly perfil = this.perfilActual.asReadonly();

  async ingresar(cedula: string, password: string): Promise<void> {
    this.perfilActual.set(await autenticarConCedula(cedula, password));
  }

  async recuperarPerfil(): Promise<Perfil | null> {
    const perfil = await cargarPerfilDeSesion();
    this.perfilActual.set(perfil);
    return perfil;
  }

  async cambiarClave(nuevaClave: string): Promise<void> {
    await actualizarClave(nuevaClave);
  }
}
