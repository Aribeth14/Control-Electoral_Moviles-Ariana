# ADR-012: Comprobar la nitidez de la foto con la varianza del Laplaciano

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R7 (comprobar la nitidez de la foto del acta antes de aceptarla).

## Contexto

R7 exige comprobar la nitidez antes de aceptar la foto, y en la primera reunión no elegimos la técnica. Una foto movida o desenfocada vuelve ilegibles los números del acta. La comprobación tiene que funcionar en el celular, sin internet y sin librerías pesadas, y debemos poder explicarla en la defensa.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Varianza del Laplaciano en canvas (JavaScript puro)** | Técnica estándar y fácil de explicar, sin dependencias y rápida sobre una imagen reducida. | Hay que calibrar el umbral, y no detecta si la foto es de otra cosa. |
| **OpenCV.js** | Implementación probada del mismo cálculo. | Pesa varios megabytes para usar una sola función. |
| **Solo confirmación visual del veedor** | No requiere código. | No es una comprobación; depende del criterio de cada persona. |
| **Servicio en la nube (OCR o visión)** | Podría leer los números del acta. | Necesita internet, claves y costo; no entra en el plazo. |

## Decisión

Usamos la varianza del Laplaciano en JavaScript puro, detrás de un puerto `NitidezPort` (ADR-004):

1. Dibujamos la foto reducida (unos 500 px de ancho) en un canvas y la pasamos a escala de grises.
2. Aplicamos el filtro Laplaciano (matriz 3 × 3: 0, 1, 0 / 1, −4, 1 / 0, 1, 0), que resalta los bordes.
3. Calculamos la varianza del resultado: una foto nítida tiene bordes marcados y varianza alta, y una borrosa, varianza baja.
4. Si la varianza queda bajo el umbral, mostramos "La foto está borrosa, tómala de nuevo" y no dejamos confirmarla. Guardamos el valor junto al acta como evidencia.

Calibramos el umbral con unas 10 fotos nítidas y 10 borrosas de un acta de prueba, tomadas con el celular de la defensa, y lo dejamos como una constante documentada.

## Consecuencias

- Ganamos el cumplimiento de R7 sin dependencias ni internet, con una técnica fácil de explicar.
- Solo medimos nitidez: no comprobamos que la foto sea realmente un acta.
- **Obligación:** calibrar el umbral con fotos reales y documentar los valores en el README.
- **Riesgo:** un umbral mal elegido puede rechazar fotos buenas con poca luz o aceptar fotos levemente movidas.

## Verificación

- Una prueba unitaria con una imagen nítida y su versión desenfocada da una varianza mayor para la nítida.
- En el celular, una foto movida a propósito se rechaza con el mensaje y una foto normal se acepta.

## Uso de IA

Le preguntamos a Claude qué técnica usar para comprobar la nitidez de una foto en una app Ionic sin depender de internet, y propuso la varianza del Laplaciano calculada en un canvas con un umbral calibrado. La aceptamos en equipo porque no agrega dependencias, funciona sin internet y podemos explicar cada paso en la defensa; los valores que obtengamos en la calibración los registramos en el README: [completar].
