# Flujo funcional de la aplicación

Última actualización: 2026-11-08

Este documento define qué debería poder hacer el usuario sin decidir todavía
tecnologías, diseño visual ni detalles de implementación.

## Navegación principal

La aplicación tendrá tres áreas:

1. **Nueva sesión:** aplicar un perfil a fotografías nuevas.
2. **Perfiles:** consultar, crear y actualizar perfiles.
3. **Historial:** revisar sesiones procesadas, errores y respaldos.

No se utilizarán términos como modelo, inferencia, dataset o checkpoint en la
interfaz destinada al fotógrafo.

## Primera apertura

La aplicación guía una configuración inicial:

1. Confirmar la instalación de Lightroom Classic.
2. Elegir una carpeta de trabajo.
3. Detectar o solicitar la ubicación habitual de las fotografías.
4. Mostrar los formatos y cámaras soportados.
5. Crear o importar el primer perfil.

Si todavía no hay perfiles entrenados, la acción **Nueva sesión** explica que
primero debe prepararse uno.

## Crear un perfil

1. El fotógrafo pulsa **Nuevo perfil**.
2. Ingresa un nombre, por ejemplo, `Evento nocturno`.
3. Selecciona las sesiones históricas que representan ese contexto.
4. La aplicación audita el material antes de entrenar:
   - fotos sin edición;
   - XMP faltantes;
   - formatos no soportados;
   - perfiles de cámara incompatibles;
   - posibles duplicados;
   - cantidad de sesiones y fotografías válidas.
5. La aplicación muestra un resumen y permite excluir problemas.
6. El fotógrafo inicia la preparación del perfil.
7. Al finalizar se informa su estado:
   - En preparación.
   - Listo para probar.
   - Necesita más ejemplos.
   - Error que requiere atención.

No se mostrará un porcentaje de “precisión” sin una prueba sobre sesiones nunca
vistas.

## Procesar una sesión

1. Pulsar **Nueva sesión**.
2. Elegir carpeta o fotografías.
3. Asignar un nombre.
4. Elegir manualmente el perfil/contexto.
5. Validar:
   - formato;
   - presencia de RAW;
   - metadata existente;
   - espacio disponible;
   - compatibilidad del perfil.
6. Mostrar una confirmación:
   - cantidad de fotos;
   - perfil seleccionado;
   - ubicación de salida;
   - tratamiento de XMP existentes;
   - tiempo estimado cuando pueda calcularse.
7. Procesar con una barra de progreso.
8. Mostrar el resultado:
   - procesadas;
   - omitidas;
   - advertencias;
   - fallos;
   - acceso a Lightroom o instrucciones para sincronizar metadatos.

## Manejo de metadatos existentes

Si una foto ya tiene XMP, la aplicación no lo reemplazará silenciosamente. Las
alternativas previstas son:

- Crear respaldo y aplicar la preedición.
- Generar los resultados en una carpeta separada.
- Omitir esas fotografías.

La alternativa predeterminada se decidirá con el flujo real del fotógrafo.

## Actualizar un perfil

Después de que el fotógrafo termine una sesión:

1. Selecciona **Agregar correcciones al perfil**.
2. La aplicación comprueba que sean las mismas fotografías procesadas.
3. Muestra cuántas tienen cambios finales útiles.
4. Registra las correcciones sin borrar la versión anterior del perfil.
5. Prepara una nueva versión.
6. La versión nueva se compara con la anterior antes de quedar como
   predeterminada.

## Estados de un perfil

Cada perfil tendrá como mínimo:

- Nombre visible.
- Contexto descrito por el fotógrafo.
- Fecha de creación y última actualización.
- Cámaras y formatos observados.
- Cantidad de fotografías válidas.
- Cantidad de sesiones independientes.
- Versión activa.
- Estado de validación.

## Errores comprensibles

Los errores deben explicar qué hacer. Ejemplos:

- `Faltan los XMP de 42 fotografías. No fueron utilizadas.`
- `Estas fotos fueron tomadas con una cámara que este perfil todavía no conoce.`
- `Lightroom está usando este catálogo. Cerralo antes de continuar.`
- `No hay espacio suficiente para crear los respaldos.`

Nunca se mostrará únicamente una excepción técnica o un código de error.
