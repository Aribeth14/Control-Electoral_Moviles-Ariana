# ADR-006: Validar formularios con Reactive Forms y reglas de dominio reutilizables

## Estado

Aceptado.

## Fecha

22 de noviembre de 2026.

## Requisitos relacionados

R2, R3, R6 y R9 (cédula ecuatoriana y datos de contacto, cambio de contraseña, consistencia de los totales del acta y estados de validación).

## Contexto

La app tiene formularios con muchas reglas: cédula ecuatoriana, teléfono, correo, contraseñas y, sobre todo, el acta, donde los votos de las organizaciones más nulos y blancos deben coincidir con el total de sufragantes. Necesitamos poder probar esas reglas, mostrar errores claros y repetir las críticas en el servidor (ADR-002).

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Reactive Forms** | Los validadores son funciones fáciles de probar, se pueden tipar y controlan bien un formulario grande como el del acta. | Más código en cada componente. |
| **Template-driven forms (ngModel)** | Rápidos de escribir para formularios pequeños. | Las validaciones propias, como la suma del acta, son más difíciles de escribir y probar. |

## Decisión

Usamos Reactive Forms tipados (`FormBuilder.nonNullable`). Las reglas son funciones puras en `core/domain/rules/` y los validadores de Angular en `presentation/shared/validators/` solo las envuelven (ADR-004):

- **Cédula:** 10 dígitos, provincia entre 01 y 24 (o 30, ecuatorianos en el exterior), tercer dígito menor que 6 y dígito verificador con el algoritmo módulo 10. Además, la cédula es única en la base.
- **Acta:** votos de las 5 organizaciones + nulos + blancos = total de sufragantes, sin negativos ni decimales. Es un validador de `FormGroup` porque compara varios campos, y la misma regla se vuelve a comprobar en `registrar_acta`.
- **Teléfono:** 10 dígitos que empiezan con 09. **Correo:** formato válido.
- **Contraseña nueva:** mínimo 8 caracteres, distinta de `Ecuador2026` y con confirmación igual. Configuramos el mismo mínimo en el panel de Auth de Supabase.
- Mostramos los errores debajo de cada campo tocado y desactivamos el botón de guardar mientras el formulario no sea válido o se esté guardando.

## Consecuencias

- Ganamos reglas centralizadas, reutilizables y probadas sin Angular.
- Perdemos brevedad: cada componente de formulario tiene más código.
- **Obligación:** mantener el mismo largo mínimo de contraseña en la app y en Supabase.
- **Riesgo:** un validador mal escrito podría rechazar cédulas válidas o aceptar actas inconsistentes; lo segundo igual lo frena el servidor.

## Verificación

- Pruebas unitarias con cédulas válidas, con dígito verificador incorrecto, con provincia inválida y con letras.
- Un acta cuyos votos no suman el total no se puede guardar.
- La contraseña `Ecuador2026` se rechaza como contraseña nueva.

## Uso de IA

Le pedimos a Claude comparar Reactive Forms y Template-driven forms y describir el algoritmo de validación de la cédula ecuatoriana. Recomendó Reactive Forms con validadores propios para la cédula y la suma de votos, y lo aceptamos; en la reunión se planteó usar Template-driven por ser más rápidos de escribir, pero el formulario del acta tiene demasiadas reglas propias. Comprobamos el algoritmo con cédulas reales del equipo: [completar]. Más tarde aceptamos su sugerencia de usar formularios tipados y separar las reglas puras de los validadores de Angular.
