# ADR-014: Guardar actas sin conexión, sincronizarlas después y resolver conflictos

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R10 (persistencia local, sincronización automática de pendientes al recuperar conexión y estrategia documentada de conflictos; opcional, con bonificación). También R6 y R7, porque la cola guarda el acta con sus votos, su foto y su GPS.

## Contexto

En los recintos el internet suele ser lento o inexistente. Si el veedor no puede guardar el acta en el momento, podría perder los datos o tener que volver a llenarla. Al reintentar el envío, la misma acta no debe registrarse dos veces. Además, mientras el veedor está sin conexión, el coordinador de recinto puede corregir esa misma acta (R5), así que al sincronizar puede haber dos versiones distintas: eso es un conflicto y R10 pide documentar cómo se resuelve. Lo implementamos después de los requisitos obligatorios, porque es un extra.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Cola local con `@capacitor/preferences` (datos) y `@capacitor/filesystem` (fotos)** | Son plugins oficiales y la solución es simple. | Hay que programar la cola y los reintentos. |
| **SQLite (`@capacitor-community/sqlite`)** | Permite consultas locales completas. | Más configuración; es excesivo para una cola. |
| **Sin modo sin conexión** | Sin trabajo extra. | El veedor depende de tener internet en el recinto. |

## Decisión

**Persistencia y sincronización**

- Si no hay conexión al guardar, el acta (votos, coordenadas y valor de nitidez) va a una cola local con `@capacitor/preferences` y la foto se guarda con `@capacitor/filesystem`.
- Cada acta lleva un UUID generado en el celular, y `registrar_acta` lo usa para ignorar un segundo envío de la misma acta.
- Cuando `@capacitor/network` detecta conexión, enviamos las pendientes en orden (primero la foto y luego `registrar_acta`, como en el ADR-003) y las quitamos de la cola al confirmarse.
- La pantalla del veedor muestra cuántas actas faltan por enviar y cuáles tienen conflicto.

**Estrategia de conflictos**

Cada acta tiene una columna `version` que aumenta en cada corrección. Al guardar sin conexión, la cola anota la versión del servidor que el veedor tenía en ese momento.

| Caso al sincronizar | Qué hacemos |
|---|---|
| Acta nueva y en el servidor no existe | Se registra normalmente. |
| Mismo UUID ya registrado (reintento) | Se ignora y se quita de la cola, porque ya está guardada. |
| Acta nueva, pero ya existe otra para la misma junta y dignidad | No se sobrescribe. Se marca "En conflicto" y el veedor ve ambas versiones. |
| Corrección hecha sobre la misma versión que tiene el servidor | Se aplica y la versión aumenta. |
| Corrección hecha sobre una versión vieja, porque otro la corrigió mientras tanto | No se sobrescribe. Se marca "En conflicto" y el veedor ve su versión junto a la del servidor. |

Ante un conflicto, gana la versión del servidor y nunca se pierde nada: la versión local queda guardada en la cola. Para aplicarla, el veedor debe enviarla como una corrección nueva, de forma consciente; si es una corrección de foto o de un acta que ya revisó el coordinador, se lo informa al coordinador. Todo queda registrado en `actas_historial`. Descartamos "gana el último en guardar" porque en un acta electoral un dato podría reemplazar a otro sin que nadie se entere.

## Consecuencias

- Ganamos que no se pierdan actas por falta de internet.
- Las validaciones del servidor (asignación, unicidad, versión) solo se conocen al sincronizar, y los conflictos requieren una decisión manual del veedor.
- **Obligación:** probar el envío repetido y el cierre de la app con actas pendientes.
- **Riesgo:** un error al sincronizar podría dejar actas atascadas; por eso las mostramos con la opción de reintentar.

## Verificación

- Con el modo avión activado, registrar un acta la deja como pendiente.
- Al desactivar el modo avión, el acta se envía sola y aparece en Supabase una sola vez, aunque se fuerce un reintento.
- Con el veedor sin conexión, el coordinador corrige la misma acta; al reconectar, el acta del veedor queda "En conflicto", la versión del coordinador se conserva y el veedor ve ambas.

## Uso de IA

Le preguntamos a Claude cómo implementar persistencia local y sincronización en Ionic con Supabase, y propuso una cola local con plugins oficiales de Capacitor y un UUID generado en el celular para no duplicar actas. Lo aceptamos en equipo como extra; como R10 pide una estrategia de conflictos, le pedimos además opciones para resolverlos y elegimos versionar cada acta y dejar que gane la del servidor sin perder la local, en lugar de "gana el último en guardar", porque en un acta electoral ningún dato debe reemplazarse sin que alguien lo revise.
