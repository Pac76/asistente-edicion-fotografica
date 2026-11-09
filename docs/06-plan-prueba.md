# Plan de la primera prueba

Última actualización: 2026-11-08

## Propósito

La primera prueba debe responder dos preguntas distintas:

1. ¿Podemos intercambiar ediciones con el Lightroom del fotógrafo de forma segura?
2. ¿Podemos aprender un perfil que le ahorre tiempo en sesiones nuevas?

Superar la primera no garantiza superar la segunda.

## Perfil inicial

Se elegirá un perfil que cumpla la mayor cantidad posible de estas condiciones:

- Alto valor para el fotógrafo.
- Varias sesiones históricas disponibles.
- Edición consistente.
- Pocas cámaras y perfiles de color mezclados.
- Uso principalmente de ajustes globales.
- Existencia de una sesión completa que pueda reservarse para prueba.

No es obligatorio elegir primero el contexto técnicamente más difícil.

## Prueba A: circuito Lightroom

### Entrada

Una cantidad pequeña de fotografías de una misma sesión, con RAW y edición
correspondiente.

### Comprobaciones

- Relacionar correctamente cada RAW con su metadata.
- Leer los controles que el fotógrafo realmente utiliza.
- Distinguir valores ausentes, valores en cero y valores predeterminados.
- Crear una edición de prueba sin tocar el RAW.
- Abrir o sincronizar el resultado en Lightroom.
- Restaurar el estado anterior mediante respaldo.

### Resultado esperado

Un informe de compatibilidad que indique:

- Formatos que funcionaron.
- Controles recuperados.
- Controles no recuperados.
- Problemas con Lightroom o XMP.
- Decisión sobre el método definitivo de intercambio.

## Prueba B: aprendizaje de un perfil

### Separación de los datos

Las fotografías se dividirán por sesiones completas:

- Entrenamiento: sesiones utilizadas para aprender.
- Validación: sesiones utilizadas durante los ajustes.
- Evaluación final: sesiones que no se observarán hasta el final.

No se separarán fotos al azar dentro de una misma ráfaga. Eso daría una impresión
falsa de calidad porque las imágenes vecinas suelen ser casi idénticas.

### Comparaciones

La sesión reservada tendrá:

1. RAW original.
2. Edición producida por el perfil.
3. Edición real del fotógrafo.
4. Si aporta valor, una base sencilla con preset o ajuste promedio.

El nuevo sistema debe mejorar de manera clara la base sencilla; comparar solo
contra el RAW no es suficiente.

### Evaluación del fotógrafo

Se procurará que el fotógrafo no sepa inicialmente qué versión produjo el
sistema. Para cada imagen o grupo indicará:

- Utilizable con cambios menores.
- Utilizable con cambios importantes.
- No utilizable.
- Prefiero esta versión.

También se medirá:

- Minutos de revisión y corrección.
- Errores repetidos.
- Coherencia entre fotos de una misma escena.
- Comportamiento en condiciones poco representadas.

## Decisión al finalizar

La prueba puede terminar en cuatro resultados:

- **Viable:** se justifica construir el MVP.
- **Viable con alcance menor:** algunos controles o cámaras quedan fuera.
- **Necesita más o mejores datos:** no se culpa automáticamente al modelo.
- **No viable en las condiciones actuales:** el ahorro no compensa la
  complejidad.

El criterio numérico de aceptación se definirá con el fotógrafo después de conocer
su tiempo actual y sus expectativas.

## Entregables de la prueba

- Inventario auditado.
- Matriz de compatibilidad con Lightroom.
- Definición definitiva del primer perfil.
- Resultados de evaluación sobre sesiones reservadas.
- Lista de límites conocidos.
- Recomendación de continuar, ajustar o detener.
- Estimación actualizada de alcance, tiempos y esfuerzo del MVP.
