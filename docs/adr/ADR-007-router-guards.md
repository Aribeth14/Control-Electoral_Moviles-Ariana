# ADR-007: Controlar la navegación con Angular Router y guards por rol

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R3, R4, R5 y R6 (activación de la cuenta en el primer acceso y funciones exclusivas de cada rol).

## Contexto

Cada rol tiene pantallas distintas y nadie debe entrar a las que no le corresponden. Un usuario nuevo debe activar su cuenta y cambiar la contraseña antes de usar la app. La seguridad real está en el backend (ADR-002), pero la navegación también debe impedir el acceso. Al abrir la app, la sesión guardada tarda un momento en restaurarse, y si los guards se ejecutan antes, mandan al login a un usuario que sí tenía sesión.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Router con guards funcionales y carga diferida** | Protege cada ruta antes de entrar y cada pantalla se descarga solo cuando se usa. | Hay que mantener varios guards. |
| **Ocultar botones y menús según el rol** | Muy simple. | Cualquiera entra escribiendo la ruta; no protege nada. |

## Decisión

Usamos Angular Router con carga diferida (`loadComponent` y `loadChildren`) y tres guards funcionales:

- **authGuard:** sin sesión, redirige al login.
- **roleGuard:** lee los roles permitidos de `data: { roles: [...] }` en la ruta; si el rol no está, redirige a la pantalla de inicio del usuario.
- **cambioClaveGuard:** si `debe_cambiar_clave` es verdadero, obliga a ir a "Activar cuenta", donde el usuario confirma su correo con un código OTP y cambia la contraseña (ADR-011).

Usamos `canMatch` en lugar de `canActivate` en las rutas de cada rol, para que el código de las pantallas de otro rol ni siquiera se descargue. Con `provideAppInitializer`, la app espera a que `getSession()` restaure la sesión y el perfil antes de evaluar los guards.

## Consecuencias

- Ganamos que cada rol solo navegue a sus pantallas y que la app abra más rápido.
- Los guards solo protegen la interfaz, no los datos.
- **Obligación:** declarar los roles permitidos en cada ruta.
- **Riesgo:** si olvidamos una política RLS, los datos quedarían expuestos aunque los guards funcionen.

## Verificación

- Con sesión de veedor, escribir la ruta del coordinador provincial lo redirige fuera, y la pestaña Network no muestra la descarga de esa pantalla.
- Sin sesión, cualquier ruta lleva al login.
- Un usuario nuevo es enviado a "Activar cuenta" y no puede salir de ahí escribiendo otra ruta.
- Con sesión iniciada, cerrar y volver a abrir la app lleva directo a la pantalla del rol.

## Uso de IA

Le preguntamos a Claude qué guards necesitábamos según los roles y el primer acceso, y propuso authGuard, roleGuard y cambioClaveGuard con carga diferida, que aceptamos. Preferimos guards a solo ocultar opciones porque el examen exige que las reglas no dependan de ocultar pantallas. En una revisión posterior aceptamos su sugerencia de usar `canMatch` y de esperar la sesión con `provideAppInitializer`, porque así se evita que la app nos mande al login al recargarla.
