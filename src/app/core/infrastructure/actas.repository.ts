import type { Dignidad } from './candidaturas.repository';
import { supabase } from './supabase.client';

interface ActaNueva {
  numeroJunta: number;
  dignidad: Dignidad;
  blancos: number;
  nulos: number;
  sufragantes: number;
  votos: Array<{ candidatura_id: number; votos: number }>;
}

export async function registrarActa(acta: ActaNueva): Promise<void> {
  const { error } = await supabase.rpc('registrar_acta', {
    p_numero: acta.numeroJunta,
    p_dignidad: acta.dignidad,
    p_blancos: acta.blancos,
    p_nulos: acta.nulos,
    p_sufragantes: acta.sufragantes,
    p_votos: acta.votos,
  });

  if (error) throw new Error(error.message);
}
