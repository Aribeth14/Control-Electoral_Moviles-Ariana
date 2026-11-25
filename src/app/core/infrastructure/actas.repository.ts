import type { Dignidad } from './candidaturas.repository';
import { LIMITE_FOTO_ACTA, type FotoActa, type obtenerUbicacionActa } from './evidencia-acta';
import { supabase } from './supabase.client';

interface VotoActa {
  candidatura_id: number;
  votos: number;
}

interface ActaNueva {
  numeroJunta: number;
  dignidad: Dignidad;
  blancos: number;
  nulos: number;
  sufragantes: number;
  votos: VotoActa[];
  foto: FotoActa;
  ubicacion: Awaited<ReturnType<typeof obtenerUbicacionActa>>;
}

interface CorreccionActa {
  numero: number;
  dignidad: Dignidad;
  blancos: number;
  nulos: number;
  sufragantes: number;
  votos: VotoActa[];
  motivo: string;
  foto: FotoActa | null;
}

export interface EstadoActasJunta {
  numero: number;
  alcaldia_reportada: boolean;
  prefectura_reportada: boolean;
}

export interface DetalleActaRecinto {
  numero: number;
  dignidad: Dignidad;
  blancos: number;
  nulos: number;
  sufragantes: number;
  tiene_foto: boolean;
  foto_ruta: string | null;
  gps_latitud: number | null;
  gps_longitud: number | null;
  votos: Array<VotoActa & { nombre: string }>;
}

export async function registrarActa(acta: ActaNueva): Promise<void> {
  const ruta = await subirFotoActa(acta.foto);

  const { error } = await supabase.rpc('registrar_acta_con_evidencia', {
    p_numero: acta.numeroJunta,
    p_dignidad: acta.dignidad,
    p_blancos: acta.blancos,
    p_nulos: acta.nulos,
    p_sufragantes: acta.sufragantes,
    p_votos: acta.votos,
    p_foto_ruta: ruta,
    p_nitidez: acta.foto.nitidez,
    p_latitud: acta.ubicacion.latitud,
    p_longitud: acta.ubicacion.longitud,
    p_precision: acta.ubicacion.precision,
    p_capturada_en: acta.ubicacion.capturadaEn,
  });

  if (error) {
    throw new Error(`No se pudo confirmar el guardado del acta: ${error.message}`);
  }
}

export async function consultarEstadoActasRecinto(): Promise<EstadoActasJunta[]> {
  const { data, error } = await supabase.rpc('consultar_estado_actas_recinto');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function consultarDetalleActaRecinto(numero: number, dignidad: Dignidad): Promise<DetalleActaRecinto> {
  const { data, error } = await supabase.rpc('consultar_detalle_acta_recinto', {
    p_numero: numero,
    p_dignidad: dignidad,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('El acta solicitada no está disponible.');
  }

  return data as DetalleActaRecinto;
}

export async function obtenerUrlFotoActa(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from('evidencias-actas').createSignedUrl(ruta, 60);

  if (error || !data?.signedUrl) {
    throw new Error('No se pudo abrir la foto del acta. Intenta de nuevo.');
  }

  return data.signedUrl;
}

export async function corregirActaRecinto(correccion: CorreccionActa): Promise<void> {
  const ruta = correccion.foto ? await subirFotoActa(correccion.foto) : null;

  const { error } = await supabase.rpc('corregir_acta_recinto', {
    p_numero: correccion.numero,
    p_dignidad: correccion.dignidad,
    p_blancos: correccion.blancos,
    p_nulos: correccion.nulos,
    p_sufragantes: correccion.sufragantes,
    p_votos: correccion.votos,
    p_motivo: correccion.motivo,
    p_foto_ruta: ruta,
    p_foto_nitidez: correccion.foto?.nitidez ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function subirFotoActa(evidencia: FotoActa): Promise<string> {
  const { data, error: errorSesion } = await supabase.auth.getUser();

  if (errorSesion || !data.user) {
    throw new Error('Vuelve a iniciar sesión para subir la foto.');
  }

  const foto = evidencia.archivo;

  if (foto.type !== 'image/jpeg' || foto.size === 0 || foto.size > LIMITE_FOTO_ACTA) {
    throw new Error('No se pudo preparar una foto válida. Tómala de nuevo.');
  }

  const ruta = `${data.user.id}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from('evidencias-actas')
    .upload(ruta, foto, { contentType: foto.type, upsert: false });

  if (error) {
    throw new Error(`No se pudo subir la foto: ${error.message}`);
  }

  return ruta;
}
