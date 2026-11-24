# ADR-011: Confirmar la cuenta con OTP en el primer acceso y enviar los correos con Brevo

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R2 y R3 (confirmación de cuenta y recuperación de contraseña por correo).

## Contexto

Las cuentas no se crean por autorregistro, sino desde una Edge Function con la contraseña inicial `Ecuador2026` (ADR-002). Para nosotras, la confirmación de cuenta de R2 necesita dos cosas: avisar al usuario, en cuanto se crea su cuenta, que ya tiene acceso, y comprobar que el correo registrado realmente le pertenece. Supabase decide qué contiene cada correo de autenticación (un enlace o un código), pero no lo entrega a usuarios reales: su servicio por defecto envía muy pocos mensajes por hora y solo a los correos del equipo del proyecto. Además, Supabase no tiene una plantilla para un aviso de bienvenida, y en Capacitor los enlaces que abren la app (deep links) son difíciles de configurar en el plazo.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Brevo como proveedor de correo** | Gratis hasta 300 correos al día, sin tarjeta y sin dominio propio; solo pide verificar el remitente. Ofrece SMTP para Supabase y una API para correos propios. | Los correos pueden caer en spam. |
| **Gmail con contraseña de aplicación** | Todas tenemos cuenta y se configura rápido. | Usa un correo personal, con límite diario y riesgo de bloqueo. |
| **Resend** | Moderno y bien documentado. | Para enviar a cualquier correo exige un dominio propio, que no tenemos. |
| **Solo correo de bienvenida** | Llega en cuanto se crea la cuenta, con contenido propio en español. | No demuestra que el correo sea del usuario. |
| **OTP en el primer acceso** | Demuestra que el correo es del usuario y no necesita deep links. | Por sí solo, el primer correo llega recién cuando el usuario entra. |
| **Enlace de confirmación o invitación de Supabase** | Es el flujo estándar de Supabase. | Pensado para autorregistro o para que el usuario defina su contraseña; choca con la contraseña inicial y necesita una página o deep link de destino. |

## Decisión

Confirmamos la cuenta en dos pasos y usamos Brevo como único proveedor de correo (cada integrante crea su propia cuenta y verifica su remitente; Gmail queda como plan B):

1. **Correo de bienvenida al crear la cuenta:** la Edge Function `crear-usuario` lo envía con la API transaccional de Brevo (`POST https://api.brevo.com/v3/smtp/email`, con la cabecera `api-key`). Incluye nombre, rol, recinto, el usuario de acceso (la cédula), la contraseña inicial y el aviso de que en el primer acceso recibirá un código para activar la cuenta. La API key es un secreto de la Edge Function (`BREVO_API_KEY`). Si el envío falla, la cuenta igual se crea, la app muestra "Usuario creado, pero no se pudo enviar el correo de bienvenida" con opción de reenviar, y guardamos la fecha de envío en `bienvenida_enviada_at`.
2. **Confirmación con OTP en el primer acceso:** la cuenta se crea con `email_confirm: true` para que el login con cédula funcione, y la confirmación real queda en `perfiles.correo_verificado`. Tras el primer login, el `cambioClaveGuard` (ADR-007) lleva a "Activar cuenta", que muestra el correo enmascarado. La app llama a `signInWithOtp({ email, options: { shouldCreateUser: false } })`, el usuario escribe el código de 6 dígitos y la app lo valida con `verifyOtp({ email, token, type: 'email' })`. Luego cambia su contraseña con `updateUser` y la función `activar_cuenta()` marca `correo_verificado = true` y `debe_cambiar_clave = false`.
3. **Recuperación de contraseña con código:** la plantilla "Reset password" muestra `{{ .Token }}`. La app pide el código, lo valida con `verifyOtp({ email, token, type: 'recovery' })` y cambia la contraseña. Como el usuario escribe su cédula, una Edge Function obtiene el correo en el servidor y dispara el envío sin mostrarlo.

Los códigos de activación y recuperación salen por Brevo configurado como SMTP personalizado de Supabase (`smtp-relay.brevo.com`, puerto 587, con el login y la clave SMTP de Brevo). Editamos y traducimos las plantillas "Magic Link" y "Reset password" para que muestren el código, y la pantalla de "ingresa el código" es la misma para activación y recuperación, con "Reenviar código" tras 60 segundos.

## Consecuencias

- Ganamos que el usuario reciba sus datos de acceso al instante y que el OTP compruebe que el correo es suyo, de modo que la recuperación llegará a la persona correcta.
- Activación y cambio de contraseña quedan en una sola pantalla, sin deep links.
- Perdemos cupo: cada usuario nuevo gasta al menos dos correos del límite de 300 al día de Brevo.
- **Obligación:** guardar la clave SMTP solo en el panel de Supabase y la API key solo como secreto, y mencionarlas en el README sin sus valores.
- **Riesgo:** los correos pueden caer en spam si el remitente no está verificado. La bienvenida lleva la contraseña inicial, pero sin el código OTP de ese correo no se puede activar la cuenta. Si un correo está mal escrito, el coordinador debe corregirlo y reenviar la bienvenida.

## Verificación

- Al crear un usuario con un correo propio llega la bienvenida con cédula, rol y contraseña inicial, y `bienvenida_enviada_at` queda con fecha.
- Con una API key inválida a propósito, el usuario se crea igual y la app muestra el aviso con la opción de reenviar.
- En el primer acceso, la app lleva a "Activar cuenta", llega el código, uno incorrecto se rechaza, el correcto permite cambiar la contraseña y `correo_verificado` queda en verdadero.
- Antes de activar la cuenta, escribir la ruta de otra pantalla no deja entrar.
- Al pedir recuperación con la cédula llega el código, permite cambiar la contraseña y el correo no aparece en la app.
- El historial de Brevo muestra los envíos, y la API key no aparece en el repositorio.

## Uso de IA

Le pedimos a Claude comparar servicios de correo gratuitos y los datos para configurar Brevo en Supabase, y aceptamos Brevo, descartando Resend porque exige dominio propio. Al revisar los ADR, Claude señaló que crear cuentas con contraseña inicial no encajaba con un correo de confirmación de Supabase y recomendó confirmar el correo con un OTP en el primer acceso. Todo el equipo estuvo de acuerdo en que el OTP es mejor, porque comprueba que el correo es del usuario, y por nuestra cuenta añadimos el correo de bienvenida con la API de Brevo para que el aviso llegue en cuanto se crea la cuenta. Contrastamos el endpoint y los datos SMTP con la documentación oficial de Brevo y Supabase: [completar].
