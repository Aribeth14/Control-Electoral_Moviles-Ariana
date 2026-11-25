import type { Dignidad } from './candidaturas.repository';
import { supabase } from './supabase.client';

export interface AvanceRecinto {
  recinto_id: string;
  recinto: string;
  parroquia: string;
  juntas_totales: number;
  alcaldia_reportadas: number;
  prefectura_reportadas: number;
}

export interface ResultadosProvinciales {
  votos: Array<{
    id: number;
    dignidad: Dignidad;
    candidato: string;
    lista: number;
    votos: number;
  }>;
  actas: Array<{
    id: number;
    recinto: string;
    junta: number;
    dignidad: Dignidad;
    latitud: number | null;
    longitud: number | null;
  }>;
}

export async function consultarAvanceProvincial(): Promise<AvanceRecinto[]> {
  const { data, error } = await supabase.rpc('consultar_avance_actas_provincial');

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function consultarResultadosProvinciales(
  recintoId: string | null,
): Promise<ResultadosProvinciales> {
  const { data, error } = await supabase.rpc(
    'consultar_resultados_actas_provincial',
    { p_recinto_id: recintoId },
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No se pudieron cargar los resultados.');

  return data as ResultadosProvinciales;
}
