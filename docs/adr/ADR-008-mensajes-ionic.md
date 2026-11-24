# ADR-008: Mostrar estados y mensajes con componentes de Ionic

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R7 y R9 (errores de cámara y ubicación, y estados explícitos de carga, éxito, error y validación).

## Contexto

El usuario debe saber siempre qué está pasando: si algo carga, si se guardó, si falló o si un dato es inválido. Los errores de Supabase llegan en inglés y con mensajes técnicos que un veedor no entiende. Con internet lento, el veedor puede tocar Guardar varias veces y crear registros duplicados.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Componentes de Ionic** | Ya vienen incluidos, se ven nativos en Android y son consistentes en toda la app. | Menos personalizables. |
| **Componentes propios o una librería externa** | Diseño a medida. | Más código y otra dependencia que justificar. |
| **alert() del navegador** | Inmediato. | Se ve poco profesional y bloquea la app. |

## Decisión

Usamos un componente de Ionic para cada situación:

| Situación | Componente |
|---|---|
| Operación en curso ("Guardando acta…") | ion-loading |
| Lista cargando | ion-skeleton-text |
| Lista sin datos ("No tienes juntas asignadas") | Estado vacío con ícono y texto |
| Éxito o error ("Acta guardada", "Sin conexión", con botón de reintentar) | ion-toast |
| Confirmación ("¿Reasignar este veedor?") | ion-alert |
| Dato inválido | Texto de error debajo del campo |

Todos los errores pasan por un `ErrorMapper` en la infraestructura, que los traduce según su código: `23505` → "Esta acta ya fue registrada", error de permisos o RLS → "No tienes permiso para esta junta", error de red → "Sin conexión" y cualquier otro → un mensaje genérico (el detalle técnico solo va a la consola). Con `@capacitor/network` sabemos si hay internet antes de intentar una operación, y desactivamos el botón de guardar mientras la operación está en curso.

## Consecuencias

- Ganamos una experiencia consistente, con el mismo mensaje para el mismo error en toda la app.
- Perdemos libertad de diseño, porque quedamos atadas al estilo de Ionic.
- **Obligación:** cada operación tiene su estado de carga y su mensaje, siempre a través del ErrorMapper.
- **Riesgo:** si una operación no captura su error, el usuario no vería ningún mensaje.

## Verificación

- Al guardar un acta aparece el indicador de carga y luego el aviso de éxito.
- Sin internet aparece "Sin conexión" con el botón de reintentar.
- Registrar dos veces la misma acta muestra "Esta acta ya fue registrada".
- Tocar Guardar varias veces seguidas crea un solo registro.
- Un campo inválido muestra su error debajo.

## Uso de IA

Le preguntamos a Claude qué componente de Ionic usar para cada estado que pide R9, y propuso la tabla de la decisión, que aceptamos porque los componentes ya vienen incluidos y se ven nativos en Android. En una revisión posterior aceptamos también sus sugerencias de centralizar los mensajes en un ErrorMapper por código de error, agregar el estado vacío, usar el plugin Network y evitar el doble envío.
