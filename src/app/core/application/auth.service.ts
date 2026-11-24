import { Injectable, signal } from '@angular/core';
import {
  activarCuenta,
  actualizarClave,
  autenticarConCedula,
  cargarPerfilDeSesion,
  cerrarSesionActual,
} from '../infrastructure/auth.gateway';

type Perfil = Awaited<ReturnType<typeof autenticarConCedula>>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly perfilActual = signal<Perfil | null>(null);
  readonly perfil = this.perfilActual.asReadonly();

  async ingresar(cedula: string, password: string): Promise<void> {
    const perfil = await autenticarConCedula(cedula, password);
    this.perfilActual.set(perfil);
  }

  async recuperarPerfil(): Promise<Perfil | null> {
    const perfil = await cargarPerfilDeSesion();
    this.perfilActual.set(perfil);
    return perfil;
  }

  async cambiarClave(nuevaClave: string): Promise<void> {
    await actualizarClave(nuevaClave);
  }

  solicitarCodigoActivacion(): Promise<void> {
    return activarCuenta({ accion: 'enviar' });
  }

  confirmarActivacion(codigo: string, clave: string): Promise<void> {
    return activarCuenta({ accion: 'confirmar', codigo, clave });
  }

  async salir(): Promise<void> {
    await cerrarSesionActual();
    this.perfilActual.set(null);
  }
}
