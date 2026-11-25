import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Umbral provisional. Calibrar con fotos del teléfono
const UMBRAL_NITIDEZ = 100;
export const LIMITE_FOTO_ACTA = 5 * 1024 * 1024;

export interface FotoActa {
  ruta: string;
  nitidez: number;
  archivo: Blob;
}

export async function tomarFotoActa(): Promise<FotoActa> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Abre la app en Android para tomar la foto del acta.');
  }

  const foto = await Camera.takePhoto({
    quality: 80,
    targetWidth: 1600,
    targetHeight: 1600,
  });

  if (!foto.webPath) {
    throw new Error('No se pudo abrir la foto. Intenta tomarla otra vez.');
  }

  const imagen = new Image();
  imagen.src = foto.webPath;
  await imagen.decode();

  const nitidez = calcularNitidez(imagen);

  if (nitidez < UMBRAL_NITIDEZ) {
    throw new Error(`La foto está borrosa. Nitidez: ${nitidez.toFixed(1)}. Tómala de nuevo.`);
  }

  const archivo = await prepararFotoActa(imagen);
  return { ruta: foto.webPath, nitidez, archivo };
}

async function prepararFotoActa(imagen: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('No se pudo preparar la foto. Tómala de nuevo.');

  const dimension = Math.max(imagen.naturalWidth, imagen.naturalHeight);
  for (const maximo of [1600, 1280, 960]) {
    const escala = Math.min(1, maximo / dimension);
    canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    const archivo = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', 0.86));
    if (archivo?.type === 'image/jpeg' && archivo.size > 0 && archivo.size <= LIMITE_FOTO_ACTA) {
      return archivo;
    }
  }
  throw new Error('No se pudo preparar una foto de hasta 5 MB. Tómala de nuevo.');
}

function calcularNitidez(imagen: HTMLImageElement): number {
  const escala = Math.min(1, 500 / imagen.naturalWidth);
  const ancho = Math.round(imagen.naturalWidth * escala);
  const alto = Math.round(imagen.naturalHeight * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;

  const contexto = canvas.getContext('2d');

  if (!contexto || ancho < 3 || alto < 3) {
    throw new Error('No se pudo comprobar la nitidez de la foto.');
  }

  contexto.drawImage(imagen, 0, 0, ancho, alto);
  const { data } = contexto.getImageData(0, 0, ancho, alto);
  const grises = new Float32Array(ancho * alto);

  for (let i = 0; i < grises.length; i++) {
    const pixel = i * 4;
    grises[i] = 0.299 * data[pixel] + 0.587 * data[pixel + 1] + 0.114 * data[pixel + 2];
  }

  let suma = 0;
  let sumaCuadrados = 0;

  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      const laplaciano = grises[i - ancho] + grises[i + ancho] + grises[i - 1] + grises[i + 1] - 4 * grises[i];

      suma += laplaciano;
      sumaCuadrados += laplaciano ** 2;
    }
  }

  const cantidad = (ancho - 2) * (alto - 2);
  const media = suma / cantidad;

  return Math.max(0, sumaCuadrados / cantidad - media ** 2);
}
export async function obtenerUbicacionActa() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Abre la app en Android para obtener la ubicación.');
  }

  try {
    const permisoActual = await Geolocation.checkPermissions();
    const permiso =
      permisoActual.location === 'granted'
        ? permisoActual
        : await Geolocation.requestPermissions({ permissions: ['location'] });

    if (permiso.location !== 'granted') {
      throw new Error('Habilita la ubicación precisa en los ajustes de la app.');
    }

    const posicion = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });

    return {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      precision: posicion.coords.accuracy,
      capturadaEn: new Date(posicion.timestamp).toISOString(),
    };
  } catch (error) {
    const codigo = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    if (codigo === 'OS-PLUG-GLOC-0007') {
      throw new Error('Activa la ubicación del teléfono y vuelve a intentarlo.');
    }

    if (codigo === 'OS-PLUG-GLOC-0010') {
      throw new Error('La ubicación tardó demasiado. Vuelve a intentarlo.');
    }

    throw error;
  }
}
