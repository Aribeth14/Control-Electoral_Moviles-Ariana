# ADR-001: Usar Ionic Angular standalone como framework

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R9 y la condición técnica del examen (solo se admite Ionic Angular standalone o Ionic React, con Capacitor).

## Contexto

Debemos elegir un único framework para las tres aplicaciones del grupo. El plazo es corto (entrega el 25 de noviembre a las 14:00) y la app necesita formularios con muchas validaciones, como la cédula y la suma de votos del acta, y pantallas protegidas para tres roles distintos. En clase trabajamos con Angular, pero ninguna de nosotras ha usado React.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Ionic Angular (standalone)** | Ya lo conocemos. Trae Reactive Forms para el acta, guards para proteger las pantallas de cada rol, Signals para el estado e inyección de dependencias para separar capas. | Genera más archivos y configuración que React. |
| **Ionic React** | Código más corto y muchos ejemplos en internet. | Tendríamos que aprenderlo desde cero en cuatro días, además de elegir aparte librerías de formularios y de rutas. |

## Decisión

Usamos Ionic Angular con componentes standalone (sin NgModule) y Capacitor para compilar a Android. Registramos las versiones exactas de Angular, Ionic y Capacitor que salen en `ionic info` en el README.

## Consecuencias

- Ganamos velocidad al trabajar con lo que ya conocemos, y el framework cubre por sí solo formularios, rutas protegidas y estado.
- La inyección de dependencias de Angular nos permite aplicar la arquitectura Clean del ADR-004 sin librerías extra.
- **Obligación:** todo el proyecto usa componentes standalone; no se crean módulos.
- **Riesgo:** Angular genera más código repetitivo que React, lo que puede quitarnos tiempo de desarrollo.

## Verificación

- El proyecto se crea con `ionic start` en modo standalone y no existe ningún archivo `*.module.ts`.
- `ionic info` muestra Angular y Capacitor con las versiones registradas en el README.
- `ionic cap build android` genera el proyecto de Android sin errores.

## Uso de IA

Le pedimos a Claude comparar Ionic Angular e Ionic React según los requisitos del examen, y recomendó Ionic Angular por sus herramientas integradas de formularios y guards. Aceptamos la recomendación, aunque la decisión final la tomamos por nuestra experiencia previa: en la reunión se planteó React por su código más corto, pero aprenderlo en el plazo disponible era un riesgo que no quisimos correr.
