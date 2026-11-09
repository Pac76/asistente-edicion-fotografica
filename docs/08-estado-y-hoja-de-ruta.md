# Estado y hoja de ruta

Última actualización: 2026-11-08

## Qué existe hoy

| Componente | Estado |
|---|---|
| Auditor de carpetas RAW/XMP (Node) | Funciona. Empareja RAW y XMP, detecta faltantes, huérfanos y duplicados y reconoce 19 ajustes globales de Adobe. Probado con archivos simulados; todavía no con RAW y XMP reales de Lightroom |
| Interfaz web local (Node) | Una sola pantalla: elegir perfil, elegir carpeta, ver diagnóstico e historial de auditorías. Los 6 perfiles precargados son etiquetas sin datos asociados |
| Lectura de XMP (Python) | Normaliza ajustes globales de Camera Raw con parser XML seguro |
| Metadatos (Python) | Lectura de EXIF por lotes con ExifTool portátil |
| Previsualización de RAW (Python) | Usa la miniatura incrustada o decodifica a media resolución. Sin pruebas con RAW reales |
| Características de luz y color (Python) | Histogramas y estadísticas globales de la previsualización |
| Calidad técnica por foto (Python) | Mide desenfoque y exposición y marca advertencias. Umbrales sin calibrar. Validado con dos fotografías de ejemplo y variantes degradadas; no con RAW reales |
| Pruebas | 9 en Node y 21 en Python |

## Qué no existe todavía

- Modelo de aprendizaje de estilos. `scikit-learn`, `joblib` y `pydantic` están
  declaradas, pero ningún código las usa.
- Selección automática de fotografías: ranking, ráfagas, duplicados, ojos cerrados.
- Escritura de XMP y generación de preediciones.
- Conexión entre la aplicación Node y el motor Python.
- Pantallas de nueva sesión, gestión de perfiles y procesamiento.
- Aplicación de escritorio e instalador.
- Validación con ediciones reales de Lightroom Classic. Falta confirmar que las
  ediciones históricas estén en archivos XMP y no solo en el catálogo `.lrcat`.

## Deuda técnica conocida

- **Dos lectores de XMP.** El auditor de Node usa expresiones regulares y el motor de
  Python lee el XML. Conviene dejar uno solo (el de Python es más robusto).
- **Valores ausentes, en cero y predeterminados.** El auditor todavía no los
  distingue, y la prueba técnica lo exige.
- **`foto_engine` no es un paquete instalable.** Se ejecuta desde `engine/`, por eso
  los comandos usan `uv run --directory engine` y rutas absolutas.
- **Servidor local sin validación de origen.** Escucha solo en `127.0.0.1` y solo
  lee archivos, por lo que el riesgo es bajo, pero conviene validar el origen de las
  peticiones antes de ampliarlo.
- **Métrica de nitidez.** Es sensible al ruido de ISO alto y a la resolución de la
  previsualización. Los umbrales deben calibrarse con fotografías etiquetadas.

## Hoja de ruta técnica

Primer hito demostrable (objetivo, todavía no alcanzado): importar una sesión,
analizarla, aprender un perfil y generar ajustes que Lightroom pueda abrir.

Orden sugerido. Cada paso depende del anterior.

1. **Circuito con material real.** Reunir RAW y XMP propios de Lightroom Classic con
   el guardado automático en XMP activado (Configuración del catálogo, Metadatos), en
   sesiones completas, sin personas identificables y sin coordenadas GPS, guardados
   fuera del repositorio. Confirmar qué controles se recuperan y distinguir valores
   ausentes, en cero y predeterminados (Prueba A de `06-plan-prueba.md`).
2. **Un solo lector de XMP.** Dejar el de Python como única implementación. Requiere
   antes un comando de Python que devuelva JSON para que la auditoría de Node lo
   consuma.
3. **Escritor de XMP no destructivo.** Con respaldo, sin tocar nunca los RAW y sin
   sobrescribir ediciones existentes sin advertencia. Comprobar que Lightroom abre el
   resultado.
4. **Constructor de dataset.** Emparejar RAW y XMP, extraer características y ajustes
   normalizados y dividir los datos por sesión completa.
5. **Línea base y primer perfil.** Ajuste promedio por perfil como referencia, y luego
   regresión de ajustes globales validada con sesiones reservadas y comparada con esa
   línea base.
6. **Selección de fotografías.** Calibrar los umbrales de calidad, ordenar dentro de
   grupos y detectar ráfagas y duplicados.
7. **Aplicación.** Pantalla de nueva sesión, paquete instalable del motor y aplicación
   de Windows.

## Verificación

```powershell
npm test
uv run pytest
uv run ruff check engine engine-tests
```

Resultado al 2026-11-08: 9 pruebas de Node, 21 de Python y lint sin errores.
