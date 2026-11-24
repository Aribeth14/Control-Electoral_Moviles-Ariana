import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { supabase } from './supabase.client';

const supabaseRecuperacion = createClient(
  environment.supabaseUrl,
  environment.supabaseKey,
  {
    auth: {
      storageKey: 'control-electoral-recuperacion',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

async function consultarPerfil(usuarioId: string) {
  return supabase
    .from('perfiles')
    .select('nombres, apellidos, rol, debe_cambiar_clave, correo_verificado, recinto_id')
    .eq('id', usuarioId)
    .single();
}

export async function autenticarConCedula(cedula: string, password: string) {
  const { data: tokens, error } = await supabase.functions.invoke<{
    access_token: string;
    refresh_token: string;
  }>('login-cedula', {
    body: { cedula, password },
  });

  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;

    if (status === 401) {
      throw new Error('Cédula o contraseña incorrecta.');
    }

    if (status === 429) {
      throw new Error('Demasiados intentos. Espera y vuelve a intentar.');
    }
  }

  if (error || !tokens?.access_token || !tokens.refresh_token) {
    throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');
  }

  const { data, error: errorSesion } = await supabase.auth.setSession(tokens);

  if (errorSesion || !data.session) {
    throw new Error('No se pudo guardar la sesión.');
  }

  const { data: perfil, error: errorPerfil } = await consultarPerfil(
    data.session.user.id,
  );

  if (errorPerfil || !perfil) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Se validó la cuenta, pero no se pudo cargar tu perfil.');
  }

  return perfil;
}

export async function cargarPerfilDeSesion() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('No se pudo recuperar la sesión.');
  }

  if (!data.session) {
    return null;
  }

  const { data: perfil, error: errorPerfil } = await consultarPerfil(
    data.session.user.id,
  );

  if (errorPerfil || !perfil) {
    throw new Error('No se pudo cargar tu perfil.');
  }

  return perfil;
}

export async function actualizarClave(nuevaClave: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: nuevaClave });

  if (error?.code === 'same_password') {
    throw new Error('Elige una contraseña diferente a la actual.');
  }

  if (error) {
    throw new Error(error.message || 'No se pudo cambiar la contraseña.');
  }
}

export async function solicitarCodigoRecuperacion(correo: string): Promise<void> {
  const { error } = await supabaseRecuperacion.auth.resetPasswordForEmail(correo);

  if (error) {
    throw new Error(
      error.status === 429
        ? 'Espera un momento antes de pedir otro código.'
        : 'No se pudo solicitar el código. Intenta de nuevo.',
    );
  }
}

export async function verificarCodigoRecuperacion(
  correo: string,
  codigo: string,
): Promise<void> {
  const { data, error } = await supabaseRecuperacion.auth.verifyOtp({
    email: correo,
    token: codigo,
    type: 'recovery',
  });

  if (error || !data.session) {
    throw new Error('El código es incorrecto o ha vencido.');
  }
}

export async function guardarClaveRecuperada(clave: string): Promise<void> {
  const { error } = await supabaseRecuperacion.auth.updateUser({
    password: clave,
  });

  if (error) {
    throw new Error(
      error.code === 'same_password'
        ? 'Elige una contraseña diferente a la anterior.'
        : 'No se pudo guardar la contraseña. Revisa los requisitos e intenta de nuevo.',
    );
  }

  await supabaseRecuperacion.auth.signOut({ scope: 'local' });
}

export async function activarCuenta(
  datos:
    | { accion: 'enviar' }
    | { accion: 'confirmar'; codigo: string; clave: string },
): Promise<void> {
  const { error } = await supabase.functions.invoke('activar-cuenta', {
    body: datos,
  });

  if (error instanceof FunctionsHttpError) {
    const cuerpo = await error.context.json().catch(() => null);

    if (typeof cuerpo?.error === 'string') {
      throw new Error(cuerpo.error);
    }
  }

  if (error) {
    throw new Error('No se pudo completar la solicitud. Intenta de nuevo.');
  }
}

export async function cerrarSesionActual(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw new Error('No se pudo cerrar la sesión. Recarga la app.');
  }
}
