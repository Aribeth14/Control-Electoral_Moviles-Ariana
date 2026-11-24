# ADR-003: Usar Capacitor Camera y Geolocation para fotos y ubicación de actas

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R7 y la condición técnica del examen (integrar Capacitor para cámara y geolocalización y compilar para Android).

## Contexto

El veedor debe fotografiar cada acta y guardar las coordenadas GPS en el mismo registro. La app tiene que manejar permisos negados y fallos de cámara o GPS. En los recintos el internet suele ser lento y, dentro de los edificios, el GPS es menos preciso. Una foto vieja o de otra mesa pondría en duda el registro.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Solo cámara, calidad intermedia** | Asegura que la foto se tomó en el momento y genera archivos livianos para el internet lento. | Si la cámara falla, no hay otra forma de subir la foto. |
| **Cámara o galería, calidad alta** | Da una salida si la cámara falla y los números se leen mejor. | Permite subir fotos viejas o de otra mesa y consume más datos móviles. |
| **GPS automático al tomar la foto** | La ubicación coincide con el momento de la foto. | Si el GPS falla, interrumpe la toma y el veedor no ve qué se guardó. |
| **GPS con botón "Obtener ubicación"** | El veedor entiende el permiso, ve sus coordenadas y puede reintentar. | Podría olvidarlo u obtener la ubicación en otro lugar. |

## Decisión

Usamos los plugins oficiales `@capacitor/camera` y `@capacitor/geolocation`, accedidos solo desde la infraestructura mediante los puertos `CameraPort` y `LocationPort` (ADR-004):

- **Foto:** solo desde la cámara (`CameraSource.Camera`), con `quality: 80` y un ancho máximo de unos 1600 px. Mostramos una vista previa y comprobamos la nitidez (ADR-012) antes de confirmar.
- **Ubicación:** con un botón "Obtener ubicación", alta precisión y un límite de 10 segundos. Guardamos latitud, longitud, precisión en metros y fecha y hora. Sin ubicación no se puede guardar el acta.
- **Controles:** si la precisión es peor que 50 m, avisamos y ofrecemos reintentar. Si el veedor está a más de 300 m de las coordenadas del recinto (fórmula de haversine), pedimos confirmación. Ajustaremos ambos valores tras probar en un recinto real.
- **Permisos:** revisamos y pedimos los permisos antes de usar cámara o GPS. Si se niegan, explicamos para qué se necesitan y ofrecemos reintentar o abrir la configuración. Si el GPS está apagado, mostramos un mensaje específico.
- **Orden de guardado:** primero subimos la foto y luego llamamos a `registrar_acta` (ADR-002). Si la función falla, borramos la foto recién subida para no dejar archivos huérfanos.

## Consecuencias

- Ganamos fotos confiables y livianas, y una ubicación que el veedor ve y que contrastamos con la del recinto.
- Perdemos la galería como respaldo: si la cámara falla, no se puede registrar la foto.
- **Obligación:** manejar todos los estados de error de cámara, permisos y GPS, y declarar los permisos en `AndroidManifest.xml`.
- **Riesgo:** dentro de los edificios el GPS puede tardar o ser poco preciso, y los umbrales podrían generar advertencias de más.

## Verificación

- En un celular Android real, negar el permiso de cámara muestra el mensaje y la opción de reintentar.
- Con el GPS apagado aparece un error, y el botón Guardar sigue desactivado sin ubicación.
- Registrar desde fuera del recinto pide confirmación.
- El acta guardada contiene latitud, longitud, precisión y la ruta de la foto.
- Si se fuerza un error en `registrar_acta`, la foto no queda en el bucket.

## Uso de IA

Le pedimos a Claude comparar opciones para capturar la foto, manejar permisos y obtener el GPS. Sugirió usar solo la cámara con calidad intermedia y tomar el GPS automáticamente al disparar la foto. Aceptamos lo de la cámara, pero rechazamos el GPS automático: preferimos un botón para que el veedor vea sus coordenadas y pueda reintentar si fallan. En una revisión posterior aceptamos sus sugerencias del umbral de precisión, la comparación con las coordenadas del recinto y el orden de guardado.
