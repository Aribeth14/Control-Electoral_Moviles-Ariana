# ADR-013: Usar animaciones para comunicar el estado, con Ionic, CSS y Haptics

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R9 (UX: estados explícitos de carga, éxito, error y validación).

## Contexto

Además de los mensajes del ADR-008, pequeñas animaciones ayudan a que el veedor entienda rápido qué pasó (por ejemplo, que la suma del acta ya cuadra) en un ambiente con prisa y ruido. No queremos que la app se vuelva lenta ni agregar dependencias pesadas. Nuestro criterio es que la animación comunique un estado, no que decore.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **`createAnimation` de Ionic** | Viene incluido, usa la Web Animations API y sirve para microinteracciones. | Hay que programar cada animación. |
| **CSS con `animate.enter` / `animate.leave` de Angular** | Es nativo del navegador; Angular lo recomienda en lugar del paquete `@angular/animations`, que quedó obsoleto. | Requiere una versión reciente de Angular. |
| **Lottie (`@lottiefiles/dotlottie-web`)** | Animaciones ilustradas de buena calidad. | Agrega dependencia y archivos, y es fácil exagerar. |
| **`@capacitor/haptics`** | Una vibración breve confirma la acción sin mirar la pantalla. | Solo funciona en el celular. |

## Decisión

Combinamos CSS con `animate.enter`, `createAnimation` de Ionic y `@capacitor/haptics`. Lottie queda como opcional, para una animación de éxito y una de estado vacío como máximo.

| Momento | Animación |
|---|---|
| La suma del acta cuadra | El total pasa de rojo a verde con un ✓ y una vibración corta |
| Obteniendo ubicación | Pulso en el ícono del pin hasta recibir las coordenadas |
| Tomar la foto | Destello breve tipo obturador y entrada de la vista previa |
| Acta guardada | ✓ animado y vibración de éxito |
| Error o foto borrosa | Leve sacudida del campo o de la vista previa y vibración de advertencia |
| Listas y dashboard | Entrada escalonada de elementos y barras que crecen al cargar |

Las animaciones duran entre 150 y 300 ms y solo mueven `transform` y `opacity`. Respetamos `prefers-reduced-motion`, y ninguna información depende solo de la animación o el color: siempre hay texto.

## Consecuencias

- Ganamos retroalimentación inmediata y clara sin librerías pesadas.
- Las animaciones no se pueden verificar con pruebas unitarias.
- **Obligación:** mantener duraciones cortas y probarlas en un celular real.
- **Riesgo:** dedicar demasiado tiempo a las animaciones antes de cumplir los requisitos obligatorios; por eso las implementamos al final.

## Verificación

- En el celular, cuando la suma del acta es correcta, el total cambia a verde y el teléfono vibra.
- Con "Quitar animaciones" activado en Android, desaparecen los movimientos y la información sigue visible.

## Uso de IA

Le pedimos a Claude opciones para animaciones en Ionic Angular e ideas aplicadas a nuestra app, y propuso combinar CSS e Ionic para las microinteracciones, Haptics para confirmar acciones y dejar Lottie como opcional, además de la tabla de momentos de la decisión. Lo aceptamos en equipo con la condición de implementarlo al final, cuando los requisitos obligatorios ya funcionen.
