# ADR-009: Consumir el backend con el SDK de Supabase y Edge Functions para lo administrativo

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R3 y R8, además del entregable de README con configuración sin secretos (proteger credenciales, no exponer claves administrativas y persistir datos e imágenes).

## Contexto

La app debe leer y guardar datos, iniciar sesión y subir fotos a Supabase. Algunas operaciones, como crear usuarios, requieren permisos de administrador que no pueden estar en el celular. La configuración debe quedar fuera del repositorio público. En Android la app corre dentro de un WebView con su propio origen, así que las llamadas a las Edge Functions son peticiones de otro origen y necesitan CORS.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **SDK oficial supabase-js** | Maneja login, consultas, funciones SQL, Storage y la renovación del token. | Es una dependencia externa que hay que mantener actualizada. |
| **HttpClient de Angular con la API REST** | Lo vimos en clase, tiene interceptores y da más control. | Habría que programar a mano el login, la renovación del token y la subida de fotos. |
| **Todas las operaciones mediante Edge Functions** | Toda la lógica queda en el servidor. | Una función por operación: mucho más trabajo. |

## Decisión

- Usamos `supabase-js` para datos, funciones SQL (`rpc`), autenticación y fotos, con un único cliente compartido y solo dentro de la capa de infraestructura (ADR-004).
- Usamos Edge Functions solo para lo administrativo: crear usuarios e iniciar sesión con cédula (ADR-002). Cada función verifica el JWT cuando corresponde, valida el cuerpo de la petición y responde a la petición previa `OPTIONS` con cabeceras CORS para el origen de la app (`https://localhost` y `capacitor://localhost` en el celular, `http://localhost:8100` en desarrollo).
- En la app va solo la clave pública del proyecto (anon key o publishable key, según la que muestre el panel), protegida por RLS. La service_role y la API key de Brevo (ADR-011) solo existen como secretos de las Edge Functions.
- `environment.ts` con los valores reales está en `.gitignore`; en GitHub subimos `environment.example.ts` y el README explica cómo copiarlo.

## Consecuencias

- Ganamos menos código y ninguna clave administrativa en la app.
- Dependemos de la API del SDK: si cambia de versión, hay que actualizar la infraestructura.
- **Obligación:** configurar los secretos y CORS de las Edge Functions y documentarlos en el README sin sus valores.
- **Riesgo:** si CORS está mal configurado, las funciones fallan en el celular aunque funcionen en el navegador.

## Verificación

- La service_role no aparece en el código de la app ni en el repositorio.
- `environment.ts` no aparece en el historial de GitHub.
- El login con cédula y la creación de usuarios funcionan en el APK instalado en un celular real, no solo con `ionic serve`.
- Sin internet, una operación muestra el mensaje de error y el botón de reintentar.

## Uso de IA

Le pedimos a Claude comparar el SDK de Supabase con HttpClient y definir qué claves pueden ir en la app. Recomendó el SDK para datos, login y fotos, Edge Functions solo para lo administrativo, la anon key en la app y la service_role solo en el servidor, y lo aceptamos; en la reunión se planteó HttpClient por dar más control, pero lo descartamos por todo el código manual que exige. En una revisión posterior nos advirtió que las Edge Functions necesitan CORS para el origen de Capacitor y que había que probarlas en el APK, y lo incorporamos.
