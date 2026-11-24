import type { Dignidad } from './candidaturas.repository';
import type { FotoActa, obtenerUbicacionActa } from './evidencia-acta';
import { supabase } from './supabase.client';

interface ActaNueva {
  numeroJunta: number;
  dignidad: Dignidad;
  blancos: number;
  nulos: number;
  sufragantes: number;
  votos: Array<{ candidatura_id: number; votos: number }>;
  foto: FotoActa;
  ubicacion: Awaited<ReturnType<typeof obtenerUbicacionActa>>;
}

export async function registrarActa(acta: ActaNueva): Promise<void> {
  const { data: sesion, error: errorSesion } = await supabase.auth.getUser();

  if (errorSesion || !sesion.user) {
    throw new Error('Vuelve a iniciar sesión para guardar el acta.');
  }

  const respuesta = await fetch(acta.foto.ruta);

  if (!respuesta.ok) {
    throw new Error('No se pudo leer la foto. Tómala de nuevo.');
  }

  const foto = await respuesta.blob();
  const tipo = foto.type || 'image/jpeg';

  if (foto.size === 0 || foto.size > 5 * 1024 * 1024) {
    throw new Error('La foto debe pesar entre 1 byte y 5 MB. Tómala de nuevo.');
  }

  if (tipo !== 'image/jpeg' && tipo !== 'image/png') {
    throw new Error('La foto debe estar en formato JPEG o PNG.');
  }

  const extension = tipo === 'image/png' ? 'png' : 'jpg';
  const ruta = `${sesion.user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: errorFoto } = await supabase.storage
    .from('evidencias-actas')
    .upload(ruta, foto, { contentType: tipo, upsert: false });

  if (errorFoto) {
    throw new Error(`No se pudo subir la foto: ${errorFoto.message}`);
  }

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