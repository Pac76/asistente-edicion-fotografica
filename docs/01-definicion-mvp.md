# Definición del MVP

Última actualización: 2026-11-08

## Objetivo

Reducir el tiempo que el fotógrafo dedica a la corrección inicial de sesiones,
aplicando automáticamente una base de edición coherente con uno de sus estilos.
El resultado debe abrirse en Lightroom Classic y quedar disponible para revisión
y retoque manual.

No se busca reemplazar el criterio final del fotógrafo. El producto será un
asistente de preedición.

## Usuario inicial

Un fotógrafo que trabaja en Windows y Lightroom Classic, cuenta con computadoras
potentes pero necesita una interfaz visual sencilla y no debe utilizar comandos.

## Concepto de perfil

Un perfil representa una forma de editar consistente dentro de un contexto,
respaldada por ejemplos históricos. El fotógrafo indicará manualmente el contexto
de cada sesión; el sistema no tendrá que adivinarlo. Ejemplos de partida:

- Casamientos.
- Eventos de día.
- Eventos de noche.
- Deportivo.
- Retrato de estudio.
- Retrato de evento al aire libre.

La lista es provisional. Antes de crear los perfiles se comprobará:

1. Si cada categoría realmente tiene decisiones de edición diferentes.
2. Cuántas fotos y sesiones completas existen para cada una.
3. Si dentro de una categoría se mezclan cámaras, perfiles de color, presets o
   estilos incompatibles.
4. Si conviene unir categorías o dividir alguna.

Un perfil no será solamente un preset. La elección manual le dará al motor el
contexto general, pero el perfil deberá adaptar sus ajustes a las condiciones de
cada fotografía manteniendo la intención visual de la categoría.

En la interfaz se utilizará la palabra **perfil**, porque es clara para el
fotógrafo. Técnicamente, la elección funciona también como una etiqueta de
contexto que se entrega al motor.

## Alcance de la primera versión

La V1 deberá permitir:

1. Crear y nombrar más de un perfil de edición.
2. Incorporar ejemplos históricos a cada perfil.
3. Validar que cada fotografía tenga su metadato de edición correspondiente.
4. Entrenar o actualizar cada perfil por separado.
5. Crear una sesión nueva e indicar manualmente su perfil/contexto.
6. Analizar previsualizaciones de las fotografías, información EXIF y demás
   entradas que se validen durante la prueba técnica.
7. Predecir ajustes globales compatibles con Lightroom.
8. Generar resultados no destructivos sin modificar los RAW originales.
9. Mostrar progreso, errores y un resumen al finalizar.
10. Permitir que el fotógrafo revise el resultado en Lightroom.
11. Conservar las correcciones finales para mejorar el perfil en futuras
    iteraciones, una vez validado ese circuito.

## Ajustes candidatos

Se comenzará por los ajustes globales que puedan leerse y escribirse de forma
estable:

- Temperatura y matiz.
- Exposición.
- Contraste.
- Iluminaciones y sombras.
- Blancos y negros.
- Textura, claridad y borrar neblina.
- Intensidad y saturación.

HSL, curvas, calibración y otros controles se incorporarán únicamente después de
inspeccionar cómo edita realmente el fotógrafo y comprobar que haya datos
consistentes. No se promete de antemano compatibilidad con todos los controles de
Lightroom.

## Flujo diario previsto

1. El fotógrafo crea una sesión.
2. Selecciona la carpeta o las fotografías.
3. Indica el perfil/contexto de la sesión.
4. El programa valida los archivos y procesa la sesión localmente.
5. El programa crea los metadatos de salida y un respaldo cuando corresponda.
6. El fotógrafo abre o sincroniza la sesión en Lightroom.
7. Revisa y termina la edición.

## Experiencia de uso

La aplicación tendrá una interfaz de Windows guiada y con lenguaje fotográfico.
Las acciones principales serán equivalentes a:

- Perfiles.
- Nueva sesión.
- Procesar.
- Ver resultado en Lightroom.

Los detalles de entrenamiento, formatos internos y modelos no deben quedar
expuestos como decisiones técnicas al usuario.

## Principios de seguridad

- Nunca alterar ni eliminar un archivo RAW.
- No sobrescribir metadatos existentes sin advertencia y respaldo recuperable.
- No escribir directamente en un catálogo de Lightroom durante la primera etapa.
- Mostrar qué fotografías fueron procesadas, omitidas o fallaron.
- Poder identificar qué versión de perfil generó una edición.
- Mantener las sesiones de los fotógrafos de forma local salvo autorización expresa.

## Validación del producto

Las pruebas se separarán por sesiones completas: una misma ráfaga o sesión no
puede aparecer parcialmente en entrenamiento y parcialmente en evaluación.

El fotógrafo evaluará:

- Porcentaje de fotos que sirven como punto de partida.
- Consistencia visual de la sesión.
- Cantidad y tipo de correcciones posteriores.
- Fotografías que deben reiniciarse.
- Tiempo total ahorrado frente a su proceso habitual.

Antes de lanzar el producto definitivo se definirá qué nivel de resultado
considera aceptable el fotógrafo. Un valor de slider cercano no garantiza por sí solo una
edición visualmente correcta.

## Etapas previstas

### 0. Descubrimiento

Inventario del flujo de Lightroom, equipos, archivos, perfiles deseados y volumen
de ejemplos.

### 1. Prueba técnica

Con una muestra pequeña se comprobará la lectura de fotografías y metadatos, el
emparejamiento RAW/XMP y la devolución no destructiva a Lightroom.

### 2. Prueba de aprendizaje

Se trabajará primero con uno o dos perfiles prioritarios y sesiones reservadas
para evaluación. Esta etapa determinará si la calidad justifica construir el MVP.

### 3. MVP de Windows

Aplicación visual, gestión de perfiles, procesamiento de sesiones, respaldos,
mensajes de error e instalación en el equipo del fotógrafo.

### 4. Piloto real

Uso supervisado en sesiones nuevas, medición del ahorro de tiempo y corrección de
fallos antes de considerar el producto estable.

## Decisiones todavía abiertas

- Cantidad y nombre definitivo de perfiles.
- Primeros uno o dos perfiles que se utilizarán para validar el sistema.
- Formatos RAW y cámaras que se soportarán inicialmente.
- Versión y configuración de Lightroom Classic.
- Forma exacta de intercambio con Lightroom.
- Ajustes que formarán parte de la primera predicción.
- Hardware mínimo.
- Método y frecuencia de actualización de perfiles.
- Criterio de aceptación y modelo de distribución.
