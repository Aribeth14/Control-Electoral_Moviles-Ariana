import { supabase } from './supabase.client';

export interface NuevoRecinto {
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  cantidad_jrv: number;
}

export interface Recinto extends NuevoRecinto {
  id: string;
}

export async function listarRecintos(): Promise<Recinto[]> {
  const { data, error } = await supabase
    .from('recintos')
    .select('id, provincia, canton, parroquia, nombre, cantidad_jrv')
    .order('parroquia')
    .order('nombre');

  if (error) {
    throw new Error('No se pudieron cargar los recintos.');
  }

  return data ?? [];
}

export async function registrarRecinto(recinto: NuevoRecinto): Promise<void> {
  const { error } = await supabase.from('recintos').insert(recinto);

  if (error?.code === '23505') {
    throw new Error('Ya existe un recinto con ese nombre en esta parroquia.');
  }

  if (error) {
    throw new Error('No se pudo guardar el recinto.');
  }

}
export interface Junta {
  id: string;
  numero: number;
}

export async function listarJuntas(recintoId: string): Promise<Junta[]> {
  const { data, error } = await supabase
    .from('juntas')
    .select('id, numero')
    .eq('recinto_id', recintoId)
    .order('numero');

  if (error) {
    throw new Error('No se pudieron cargar las juntas del recinto.');
  }

  return data ?? [];
}
