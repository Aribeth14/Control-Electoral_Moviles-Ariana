# ADR-004: Organizar la app con una arquitectura Clean ligera

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R9 y la condición técnica del examen (justificar la separación de páginas, servicios, modelos, validaciones y acceso a datos).

## Contexto

La app tiene tres roles con muchas pantallas y reglas de negocio importantes, como la suma de votos del acta. Necesitamos separar el código para que sea ordenado, fácil de probar y explicable en la defensa, sin gastar todo el tiempo en estructura. También queremos que las reglas de negocio no dependan de Supabase, para poder probarlas sin conexión.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Clean ligera (dominio, aplicación, infraestructura, presentación)** | La lógica no depende de Supabase y los casos de uso se prueban con repositorios falsos. | Más archivos que una arquitectura por capas simple. |
| **Capas simples (páginas, servicios, repositorios)** | Rápida de armar y fácil de entender. | La lógica de negocio queda mezclada con las llamadas a Supabase. |
| **Clean completa en todas las acciones** | Muy estricta y uniforme. | Demasiados archivos para el plazo. |
| **Todo dentro de las páginas** | Lo más rápido al inicio. | No cumple R9 y es casi imposible de probar. |

## Decisión

Usamos una arquitectura Clean ligera, con carpetas por rol en la presentación:

```
src/app/
├─ core/
│  ├─ domain/          → modelos, puertos (clases abstractas), reglas puras
│  │  ├─ models/
│  │  ├─ ports/        → ActaRepository, CameraPort, LocationPort...
│  │  └─ rules/        → esCedulaValida(), sumaActaCuadra()...
│  ├─ application/     → casos de uso (registrar-acta, corregir-acta,
│  │                     crear-usuario, asignar-veedor)
│  └─ infrastructure/  → Supabase, cámara, GPS, mappers, ErrorMapper
└─ presentation/
   ├─ shared/          → componentes comunes, validadores de formulario
   ├─ auth/
   ├─ provincial/
   ├─ recinto/
   └─ veedor/
```

- **Dependencias hacia adentro:** las capas externas dependen de las internas, nunca al revés. El dominio no importa Angular, Ionic, Capacitor ni Supabase.
- **Puertos como clases abstractas:** las interfaces de TypeScript no existen en tiempo de ejecución y no sirven para inyectar. Por eso cada puerto es una clase abstracta (`export abstract class ActaRepository { ... }`) y en `app.config.ts` se enlaza su implementación con `{ provide: ActaRepository, useClass: SupabaseActaRepository }`. En las pruebas enlazamos un repositorio falso.
- **Mappers:** la infraestructura convierte las filas de la base (`snake_case`) en modelos del dominio (`camelCase`); ningún tipo de Supabase sale de esa capa.
- **Reglas puras:** la cédula y la suma del acta son funciones puras en `domain/rules/`. Los validadores de Reactive Forms viven en `presentation/shared/validators/` y solo las envuelven (ADR-006).
- Creamos casos de uso solo para registrar acta, corregir acta, crear usuario y asignar veedor. Las consultas simples van directo al repositorio.

## Consecuencias

- Ganamos reglas de negocio que se prueban sin backend ni Angular, y si cambiáramos de backend solo cambiaría la infraestructura.
- Perdemos tiempo de configuración: hay más archivos y cada servicio externo necesita su puerto registrado en `app.config.ts`.
- **Obligación:** las páginas nunca importan Supabase ni plugins de Capacitor.
- **Riesgo:** si no dominamos el patrón, se notará en la defensa.

## Verificación

- Una regla `no-restricted-imports` de ESLint impide importar `@supabase/supabase-js`, `@capacitor/*`, `@angular/*` o `@ionic/*` en `core/domain/`, y `@supabase/supabase-js` o `@capacitor/*` en `presentation/`. `npm run lint` pasa sin errores.
- Los casos de uso tienen pruebas unitarias con repositorios falsos inyectados con el mismo token (ADR-010).

## Uso de IA

Le pedimos a Claude que nos explicara la diferencia entre una arquitectura por capas y Clean, y que propusiera una estructura de carpetas. Sugirió Clean ligera con casos de uso solo en las acciones principales, y lo aceptamos porque aplicarlos a todo no entraba en el plazo; en la reunión se planteó la arquitectura por capas simple, pero la descartamos porque deja la lógica pegada a Supabase. En una revisión posterior, Claude advirtió que las interfaces de TypeScript no se pueden inyectar en Angular y que nuestros validadores hacían depender al dominio de Angular; por eso adoptamos los puertos como clases abstractas, las reglas puras y la verificación con ESLint.
