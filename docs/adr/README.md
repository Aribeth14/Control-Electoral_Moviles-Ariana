# Registro de decisiones de arquitectura (ADR)

**App de control electoral · Grupo 4 · Desarrollo de Aplicaciones Móviles · ESFOT · Prueba 2**

**Proyecto:** aplicación móvil para el control electoral de recintos, juntas y actas en Pichincha – Quito (Ionic Angular, Capacitor y Supabase).

**Integrantes:** Amy Mishell Díaz Rosero, Josselyn Mabel Reyes Parrales, Ariana Elizabeth Villota Jácome.

**Fecha de la reunión:** 22 de noviembre de 2026. **Enlace al video:** [completar]

Cada integrante desarrolla su propia aplicación respetando esta línea base; cualquier cambio se documenta con un ADR que reemplaza al anterior.

## Requisitos

| Código | Requisito |
|---|---|
| R1 | Datos iniciales: recintos de una provincia y cantón elegidos (cantón, parroquia, nombre y cantidad de JRV), cinco organizaciones y sus candidaturas a alcaldía y a prefectura. |
| R2 | Jerarquía y cuentas: sin autorregistro; el coordinador provincial crea coordinadores de recinto y estos crean veedores, con cédula ecuatoriana validada, nombres, apellidos, teléfono y correo, y confirmación de cuenta. |
| R3 | Acceso: inicio de sesión con cédula, contraseña inicial Ecuador2026, cambio obligatorio en el primer acceso, recuperación por correo y sin claves administrativas en la app. |
| R4 | Coordinador provincial: listar y crear recintos, crear y asignar un coordinador por recinto, y consultar avance de actas, coordenadas GPS y dashboard de votos por candidato, por recinto o consolidado. |
| R5 | Coordinador de recinto: ver las mesas de su recinto y sus estados, crear veedores, asignarlos y reasignarlos a JRV, y corregir datos y fotos de las actas del recinto. |
| R6 | Veedor: ver solo sus mesas, registrar actas de alcalde y prefecto (votos de cinco organizaciones, nulos, blancos y total de sufragantes), validar la consistencia de los totales y permitir correcciones. |
| R7 | Cámara y ubicación: foto de cada acta desde la app con comprobación de nitidez, GPS guardado en el registro y manejo de permisos y errores. |
| R8 | Backend y seguridad: Firebase, Supabase o Appwrite justificado por ADR, con reglas por rol y pertenencia, persistencia de datos e imágenes, demostrando que un veedor no accede a mesas ajenas. |
| R9 | Arquitectura y UX: separar presentación, lógica de negocio y acceso a datos, justificar el manejo de estado y mostrar estados de carga, éxito, error y validación. |
| R10 | Conectividad (extra): persistencia local y sincronización automática de pendientes al recuperar conexión, con estrategia documentada de conflictos. |

## Índice de decisiones

| ADR | Decisión | Estado |
|---|---|---|
| [ADR-001](ADR-001-ionic-angular-standalone.md) | Usar Ionic Angular standalone como framework | Aceptado |
| [ADR-002](ADR-002-supabase-backend.md) | Usar Supabase como backend, con RLS, Storage y la integridad de los datos en la base | Aceptado |
| [ADR-003](ADR-003-camara-gps-capacitor.md) | Usar Capacitor Camera y Geolocation para fotos y ubicación de actas | Aceptado |
| [ADR-004](ADR-004-arquitectura-clean-ligera.md) | Organizar la app con una arquitectura Clean ligera | Aceptado |
| [ADR-005](ADR-005-estado-angular-signals.md) | Manejar el estado con Angular Signals | Aceptado |
| [ADR-006](ADR-006-reactive-forms.md) | Validar formularios con Reactive Forms y reglas de dominio reutilizables | Aceptado |
| [ADR-007](ADR-007-router-guards.md) | Controlar la navegación con Angular Router y guards por rol | Aceptado |
| [ADR-008](ADR-008-mensajes-ionic.md) | Mostrar estados y mensajes con componentes de Ionic | Aceptado |
| [ADR-009](ADR-009-sdk-supabase-edge-functions.md) | Consumir el backend con el SDK de Supabase y Edge Functions para lo administrativo | Aceptado |
| [ADR-010](ADR-010-pruebas.md) | Probar con pruebas unitarias, un script de RLS y una tabla manual por rol | Aceptado |
| [ADR-011](ADR-011-confirmacion-otp-correos-brevo.md) | Confirmar la cuenta con OTP en el primer acceso y enviar los correos con Brevo | Aceptado |
| [ADR-012](ADR-012-nitidez-laplaciano.md) | Comprobar la nitidez de la foto con la varianza del Laplaciano | Aceptado |
| [ADR-013](ADR-013-animaciones.md) | Usar animaciones para comunicar el estado, con Ionic, CSS y Haptics | Aceptado |
| [ADR-014](ADR-014-persistencia-local.md) | Guardar actas sin conexión, sincronizarlas después y resolver conflictos | Aceptado |
