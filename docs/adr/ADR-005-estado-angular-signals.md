# ADR-005: Manejar el estado con Angular Signals

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R9 (estrategia de manejo de estado y estados explícitos de carga, éxito, error y validación).

## Contexto

La app comparte datos entre pantallas (usuario en sesión, juntas, actas) y cada pantalla debe mostrar si está cargando, si hubo un error, si no hay datos o si terminó. Supabase responde con promesas. Además, el mismo celular podría usarlo más de una persona durante la jornada.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Angular Signals** | Viene incluido en Angular, encaja con las promesas de Supabase y `computed()` calcula la suma de votos mientras el veedor escribe. | Es más nuevo y hay menos ejemplos que con RxJS. |
| **RxJS con BehaviorSubject** | Muy documentado y bueno para flujos de eventos. | Más complejo: suscripciones que hay que cerrar y riesgo de fugas de memoria. |
| **NgRx** | Muy estructurado para apps grandes. | Demasiado pesado para el tamaño de la app y el plazo. |

## Decisión

Usamos Signals dentro de los servicios para el estado compartido. Todas las cargas usan el mismo tipo:

```
type Estado<T> = {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  data?: T;
  error?: string;
};
```

Los servicios exponen sus signals como solo lectura (`asReadonly()`) y solo los cambian con sus métodos. Usamos `computed()` para valores derivados, como la suma de votos o los totales del dashboard. Al cerrar sesión llamamos a `reset()` en cada servicio. Si implementamos tiempo real, el callback de Supabase Realtime escribe directo en un signal, sin RxJS.

## Consecuencias

- Ganamos menos código y un estado fácil de leer, con los mismos cinco estados en todas las pantallas.
- Perdemos la cantidad de ejemplos que tiene RxJS en internet.
- **Obligación:** cada servicio expone sus signals de solo lectura y un método `reset()`.
- **Riesgo:** si olvidamos reiniciar algún servicio al cerrar sesión, el siguiente usuario del celular vería datos del anterior.

## Verificación

- Al escribir votos en el formulario del acta, el total se actualiza al instante.
- Cada pantalla muestra carga, estado vacío y error cuando se simula una falla de conexión.
- Tras cerrar sesión como veedor A e iniciar como veedor B, no aparece ningún dato de A.

## Uso de IA

Le pedimos a Claude comparar Signals, RxJS y NgRx para el tamaño y plazo del proyecto, y recomendó Signals dentro de los servicios con `computed()`. Lo aceptamos; en la reunión se planteó RxJS por su documentación, pero Signals es más simple y Supabase trabaja con promesas, y NgRx lo descartamos por el tiempo. Más tarde aceptamos su sugerencia del tipo `Estado<T>` y de reiniciar los signals al cerrar sesión.
