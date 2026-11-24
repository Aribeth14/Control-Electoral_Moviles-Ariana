# ADR-010: Probar con pruebas unitarias, un script de RLS y una tabla manual por rol

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R6, R7, R8 y R9, además del entregable de README con pruebas (consistencia de totales, errores de cámara y GPS, acceso solo a mesas propias y estados de validación).

## Contexto

En la defensa tenemos que demostrar que las reglas funcionan, que la seguridad está en el backend y que la cámara y el GPS manejan sus errores. El ADR-004 promete casos de uso probados con repositorios falsos. El tiempo es limitado, y la cámara y el GPS solo se prueban bien en un celular real.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Pruebas unitarias de reglas y casos de uso** | Dejan evidencia en el código y se ejecutan solas y rápido. | Solo prueban la lógica, no las pantallas ni la conexión. |
| **Script SQL de pruebas de RLS** | Prueba la seguridad real del backend y se puede repetir. | Hay que escribir SQL de prueba. |
| **Tabla de pruebas manuales por rol** | Cubre roles, cámara y GPS en un celular real. | Toma tiempo y depende del cuidado de quien la ejecuta. |
| **Pruebas de punta a punta (Playwright o Cypress)** | Simulan al usuario sin repetir todo a mano. | Configuración larga, y no cubren cámara ni GPS. |

## Decisión

Combinamos tres tipos de pruebas:

- **Pruebas unitarias** con `ng test`: las reglas de cédula y suma de votos con datos válidos e inválidos, y los casos de uso `registrar-acta` y `crear-usuario` con repositorios falsos (por ejemplo, que no se llame al repositorio si la suma no cuadra, o que se borre la foto si falla el registro).
- **Script de RLS** en `supabase/tests/rls.sql`: dentro de una transacción que se revierte, simulamos cada rol con `set local role authenticated` y `set local request.jwt.claims` y comprobamos que el veedor A ve 0 actas del veedor B, que no puede cambiar su rol y que un coordinador no ve otro recinto.
- **Tabla manual por rol** en el README (caso, pasos, resultado esperado y obtenido): inicio de sesión con los tres roles, activación de cuenta con OTP, recuperación de contraseña, veedor A intentando ver la mesa del veedor B, corrección de actas, y cámara y GPS en un celular real con permisos negados, GPS apagado y sin internet.

## Consecuencias

- Ganamos evidencia clara para la defensa, y la seguridad se prueba en el backend y no solo en la interfaz.
- No tenemos pruebas automáticas de las pantallas.
- **Obligación:** repetir el script de RLS y la tabla manual tras cada cambio importante.
- **Riesgo:** las pruebas manuales dependen del cuidado de quien las ejecuta.

## Verificación

- `ng test` ejecuta las pruebas de reglas y casos de uso sin fallos.
- `rls.sql` corre en el editor SQL de Supabase sin errores.
- El README contiene la tabla de pruebas manuales completa.

## Uso de IA

Le pedimos a Claude comparar tipos de pruebas y sugerir casos por rol. Recomendó pruebas unitarias de validadores, una tabla manual por rol y pruebas en celular real, y lo aceptamos; en la reunión se plantearon Playwright o Cypress, pero los descartamos por el plazo y porque no cubren cámara ni GPS. En una revisión posterior nos señaló que el ADR-004 prometía probar los casos de uso y que no lo estábamos haciendo, y sugirió el script de RLS; incorporamos ambas cosas.
