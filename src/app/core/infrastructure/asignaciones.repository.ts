import { supabase } from './supabase.client';

export interface JuntaAsignable {
  numero: number;
  veedor_id?: string | null;
  veedor_nombre?: string;
}

export interface VeedorAsignable {
  id: string;
  nombre: string;
}

export interface AsignacionesJuntas {
  juntas: JuntaAsignable[];
  veedores: VeedorAsignable[];
}

export async function consultarAsignaciones(): Promise<AsignacionesJuntas> {
  const { data, error } = await supabase.rpc('consultar_asignaciones_juntas');

  if (error) throw new Error(error.message);

  return data as AsignacionesJuntas;
}

export async function asignarJunta(
  numero: number,
  veedorId: string,
): Promise<void> {
  const { error } = await supabase.rpc('asignar_junta', {
    p_numero: numero,
    p_veedor_id: veedorId,
  });

  if (error) throw new Error(error.message);
}
