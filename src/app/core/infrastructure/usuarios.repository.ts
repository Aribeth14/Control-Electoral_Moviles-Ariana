import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase.client';

export interface NuevoCoordinador {
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  correo: string;
  recinto_id: string;
}

interface AltaCoordinador {
  id: string;
  bienvenida_enviada: boolean;
  mensaje: string;
}

export async function crearCoordinador(
  datos: NuevoCoordinador,
): Promise<AltaCoordinador> {
  const { data, error } = await supabase.functions.invoke<AltaCoordinador>(
    'crear-usuario',
    { body: datos },
  );

  if (error instanceof FunctionsHttpError) {
    const cuerpo = await error.context.json().catch(() => null);

    if (typeof cuerpo?.error === 'string') {
      throw new Error(cuerpo.error);
    }

    if (error.context.status === 401) {
      throw new Error('Tu sesión no es válida. Vuelve a iniciar sesión.');
    }
  }

  if (error || !data?.id) {
    throw new Error('No se pudo confirmar el alta. Revisa si el perfil se creó antes de reintentar.');
  }

  return data;
}
