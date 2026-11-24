# ADR-002: Usar Supabase como backend, con RLS, Storage y la integridad de los datos en la base

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R1, R2, R3, R4, R5, R6 y R8 (precarga de datos, creación jerárquica de cuentas, inicio de sesión con cédula, funciones de cada rol, dashboard de votos y reglas de acceso por rol y pertenencia aplicadas en el backend).

## Contexto

La app necesita autenticación sin autorregistro, reglas de acceso por rol aplicadas en el servidor, almacenamiento de fotos y datos relacionados (recinto → junta → acta → votos). No podemos exponer claves administrativas en la app. Además, cualquier validación hecha solo en el celular se puede saltar llamando directamente a la API, así que las reglas críticas (a qué juntas puede acceder cada veedor, que los votos sumen el total, que no haya dos actas iguales) también deben cumplirse en la base de datos. Cada integrante tiene su propio proyecto de Supabase, por lo que el esquema tiene que poder reproducirse igual en los tres.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Supabase** | Base relacional (PostgreSQL) que encaja con recinto → junta → acta y permite sumar votos con SQL. Políticas RLS por fila, funciones SQL, Edge Functions y Storage en el plan gratis sin tarjeta. | El proyecto gratis se pausa tras 7 días sin uso, y una política RLS mal escrita puede exponer datos de otras mesas. |
| **Firebase** | Muchos tutoriales con Ionic y reglas de seguridad en Firestore. | Cloud Functions exige el plan Blaze con tarjeta. Al ser NoSQL, obliga a duplicar datos y complica sumar los votos del dashboard. |
| **Appwrite** | Functions y Storage gratis, con permisos por documento. | Pocos ejemplos con Ionic y permisos más manuales. |

## Decisión

Usamos Supabase con estas reglas:

- **Creación de usuarios:** una Edge Function `crear-usuario` verifica quién la llama (el provincial crea coordinadores de recinto; el coordinador crea veedores solo de su recinto), crea la cuenta con la contraseña inicial `Ecuador2026`, inserta el perfil y envía el correo de bienvenida (ADR-011).
- **Inicio de sesión con cédula:** Supabase autentica con correo, así que una Edge Function `login-cedula` recibe cédula y contraseña, busca el correo en el servidor, inicia sesión y devuelve solo los tokens, que la app carga con `setSession()`. El correo nunca llega a la app y cualquier error responde "Cédula o contraseña incorrecta". Para frenar la fuerza bruta, la función bloquea una cédula 15 minutos tras 5 intentos fallidos (tabla `intentos_login`).
- **Primer acceso:** el usuario confirma su correo con un código OTP y cambia la contraseña (ADR-011); al terminar, la función `activar_cuenta()` marca `correo_verificado = true` y `debe_cambiar_clave = false`.
- **RLS en todas las tablas y en Storage:** el provincial ve todo, el coordinador solo su recinto y el veedor solo sus juntas asignadas. Las políticas usan funciones auxiliares `security definer` (`mi_rol()`, `mi_recinto()`, `veedor_asignado(junta_id)`) para evitar la recursión de RLS.
- **Nadie edita su propio perfil:** `perfiles` no tiene políticas de `UPDATE` para el usuario, así nadie puede cambiarse el rol o el recinto desde la consola. Esos cambios pasan solo por Edge Functions o funciones SQL.
- **Actas con funciones transaccionales:** `registrar_acta(...)` y `corregir_acta(...)` guardan el acta y sus votos en una sola transacción, vuelven a validar que votos + nulos + blancos = total de sufragantes y comprueban que la junta está asignada a quien llama. La app no inserta en esas tablas directamente.
- **Restricciones:** `unique (junta_id, dignidad)` en actas, `unique (acta_id, organizacion_id)` en votos, un índice único parcial para que solo haya un veedor activo por junta, otro para que cada recinto tenga un solo coordinador (R4), cédula única y `check` para que no haya valores negativos.
- **Correcciones y auditoría:** pueden corregir el veedor asignado a la junta (R6) y el coordinador de su recinto, que también puede cambiar la foto (R5); `corregir_acta` comprueba uno de esos dos casos. Un trigger guarda la versión anterior de cada acta corregida en `actas_historial`, con quién la corrigió y cuándo.
- **Dashboard (R4):** vistas con `security_invoker = true` suman los votos por candidato, por recinto y consolidados, y muestran el avance de actas y sus coordenadas GPS; así respetan la RLS.
- **Fotos:** bucket privado `actas`, con ruta `recinto_id/junta_id/dignidad-<marca de tiempo>.jpg`. Una corrección sube un archivo nuevo para no perder la evidencia, y las fotos se muestran con URL firmadas.
- **Reproducibilidad:** el esquema, las políticas, las funciones y los datos de R1 (5 a 8 recintos reales de Quito, 5 organizaciones y sus candidaturas a alcaldía y prefectura) viven en `supabase/migrations/` y `supabase/seed.sql`.

Modelo de datos:

| Tabla | Contenido principal |
|---|---|
| perfiles | id, cédula, nombres, apellidos, teléfono, correo, rol, recinto, debe_cambiar_clave, correo_verificado, bienvenida_enviada_at |
| recintos | provincia, cantón, parroquia, nombre, cantidad de JRV, latitud, longitud |
| juntas | recinto, número de JRV (su estado se calcula con una vista a partir de sus actas) |
| asignaciones | junta, veedor, fecha, activa (historial de reasignaciones) |
| organizaciones | nombre y siglas |
| candidatos | organización, nombre, dignidad (alcalde o prefecto) |
| actas | junta, dignidad, nulos, blancos, total, ruta de la foto, latitud, longitud, precisión, fecha de captura, estado (pendiente → registrada → corregida), version, uuid_cliente (ADR-014), registrada_por |
| votos_acta | acta, organización, votos |
| actas_historial | acta, versión, valores anteriores, foto anterior, corregida_por, fecha |
| intentos_login | cédula, intentos fallidos, bloqueado_hasta |

## Consecuencias

- Ganamos seguridad real: las reglas viven en la base de datos y no solo en ocultar pantallas o validar en el celular.
- Las correcciones de actas quedan auditadas y la evidencia fotográfica no se pierde.
- Perdemos simplicidad: parte de la lógica queda escrita en SQL y hay que mantener las migraciones en el repositorio.
- **Obligación:** reactivar el proyecto de Supabase antes de la defensa, porque el plan gratis se pausa por inactividad.
- **Riesgo:** una política RLS incorrecta podría exponer datos de otras mesas; lo mitigamos con el script de pruebas del ADR-010.

## Verificación

- Con sesión del veedor A, consultar las actas de una junta del veedor B devuelve 0 filas, y llamar a `registrar_acta` sobre esa junta devuelve error.
- Con sesión de veedor, `update perfiles set rol = 'provincial'` desde la consola no modifica ninguna fila.
- Llamar a `registrar_acta` con votos que no suman el total devuelve error, aunque se salte el formulario.
- Insertar una segunda acta para la misma junta y dignidad falla por la restricción `unique`, y asignar un segundo coordinador al mismo recinto también falla.
- Un coordinador corrige un acta de su recinto y aparece la versión anterior en `actas_historial`; un coordinador de otro recinto no puede corregirla.
- Tras 5 intentos fallidos con la misma cédula, el sexto queda bloqueado.
- Ninguna clave service_role aparece en el código de la app, y un proyecto nuevo queda igual aplicando solo las migraciones y el seed.

## Uso de IA

Le pedimos a Claude comparar Firebase, Supabase y Appwrite según R2, R3 y R8, y proponer el modelo de datos y una forma de iniciar sesión con cédula. Aceptamos Supabase con RLS y el login mediante Edge Function, y descartamos su otra idea de registrar correos falsos con la cédula porque impediría recuperar la contraseña. En la reunión decidimos nosotras guardar las asignaciones en una tabla aparte, en lugar de poner el veedor en la junta, para conservar el historial. En una revisión posterior, Claude señaló que la suma de votos solo se validaba en el celular y que un usuario podría cambiarse el rol; por eso agregamos las funciones transaccionales, las restricciones, el bloqueo de edición de perfiles, la auditoría y la protección contra fuerza bruta.
