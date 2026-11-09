# Asistente local de edición fotográfica

Proyecto personal para construir una aplicación de Windows que aprenda distintas
formas de editar de un fotógrafo y genere preediciones compatibles con Lightroom
Classic.

El producto está en una etapa temprana. Existen herramientas de auditoría de datos y
una base técnica del motor, pero todavía no hay modelo de aprendizaje, selección
automática de fotos ni escritura de XMP. No se promete una calidad determinada:
primero se validarán los datos, la integración con Lightroom y el ahorro de tiempo
real.

## Estado actual

- Etapa: base técnica y herramientas de análisis; sin modelo de aprendizaje.
- Plataforma inicial: Windows.
- Procesamiento: local.
- Integración inicial prevista: archivos XMP; sin modificar los RAW.
- Función principal: perfiles de edición elegidos manualmente por el fotógrafo.

## Documentos del proyecto

- [Definición del MVP](docs/01-definicion-mvp.md)
- [Funciones pospuestas](docs/02-backlog-pospuesto.md)
- [Preguntas para validar con fotógrafos](docs/03-preguntas-fotografos-piloto.md)
- [Registro de decisiones](docs/04-registro-decisiones.md)
- [Flujo funcional de la aplicación](docs/05-flujo-funcional.md)
- [Plan de la primera prueba](docs/06-plan-prueba.md)
- [Entorno de desarrollo](docs/07-entorno-desarrollo.md)
- [Estado y hoja de ruta](docs/08-estado-y-hoja-de-ruta.md)
- [Organización y auditoría del material de prueba](recepcion-material/README.md)

Estos documentos son vivos: se actualizarán a medida que aparezca información
real de fotógrafos y se validen o descarten supuestos.

## Prototipo disponible

Ya existe un primer componente funcional para auditar el material de prueba. Busca
RAW y XMP de forma recursiva, los relaciona por carpeta y nombre, detecta
faltantes o duplicados y reconoce una primera lista de ajustes globales de Adobe.
No modifica los archivos analizados.

Requisito actual de desarrollo: Node.js 22 o posterior.

### Interfaz local

```powershell
npm run ui
```

Luego abrir `http://127.0.0.1:4173`. La interfaz permite elegir el
perfil/contexto, seleccionar una carpeta de Windows y ver el diagnóstico.

### Auditoría desde terminal

```powershell
npm run audit -- "C:\ruta\de\la\muestra" --profile "Evento nocturno"
```

Para conservar un reporte estructurado:

```powershell
npm run audit -- "C:\ruta\de\la\muestra" --profile "Evento nocturno" --json "reporte.json"
```

### Pruebas

```powershell
npm test
```

El prototipo no es todavía el instalador de la aplicación ni contiene un modelo de
edición. Su objetivo es validar datos reales sin tomar decisiones prematuras sobre el
motor de aprendizaje.

## Motor fotográfico

El entorno Python aislado contiene hoy:

- Lectura y normalización de ajustes globales desde XMP (`xmp.py`).
- Lectura de EXIF por lotes con ExifTool (`metadata.py`).
- Extracción de previsualizaciones de RAW (`raw_preview.py`).
- Características económicas de luz y color (`image_features.py`).
- Calidad técnica por fotografía: desenfoque y exposición (`quality.py`).

Todavía **no** incluye modelos entrenados, selección automática de fotos ni
escritura de XMP. Ver [Estado y hoja de ruta](docs/08-estado-y-hoja-de-ruta.md).

### Calidad técnica por foto

Analiza el desenfoque y la exposición de los RAW e imágenes de una carpeta y marca
las fotografías que probablemente tengan problemas. Solo lee los archivos:

```powershell
uv run --directory engine python -m foto_engine.quality "C:\ruta\absoluta\carpeta" --json "C:\ruta\absoluta\reporte.json"
```

Usá rutas absolutas, porque el comando se ejecuta desde `engine/`. El reporte debe
guardarse fuera de la carpeta analizada. Los umbrales son un punto de partida sin
calibrar con fotografías etiquetadas: dependen del estilo y deben ajustarse por
perfil.

### Entorno

Para preparar y comprobar todo el entorno:

```powershell
.\scripts\check-environment.ps1
```
