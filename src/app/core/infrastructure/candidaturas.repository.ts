import { supabase } from './supabase.client';

export type Dignidad = 'alcaldia' | 'prefectura';

export async function listarCandidaturas(dignidad: Dignidad) {
  const { data, error } = await supabase
    .from('candidaturas')
    .select(`
      id,
      nombre_candidato,
      organizacion:organizaciones_politicas!inner (
        numero_lista,
        nombre
      )
    `)
    .eq('dignidad', dignidad)
    .order('organizacion(numero_lista)');

  if (error) {
    throw new Error('No se pudieron cargar las candidaturas.');
  }

  return data;
}
