# Entorno de desarrollo

Última actualización: 2026-11-08

## Equipo actual

- Windows 11 Pro de 64 bits.
- AMD Ryzen 5 7535U.
- 16 GB de RAM.
- Gráficos AMD Radeon integrados, sin GPU NVIDIA dedicada.
- Disco de 476 GB, con aproximadamente 228 GB libres al preparar el entorno.

Este equipo es adecuado para desarrollo, auditoría de material, extracción de
características, modelos tradicionales y pruebas por CPU. No se instalará CUDA:
la computadora no tiene hardware NVIDIA compatible.

Los entrenamientos profundos que eventualmente necesiten GPU se evaluarán
después de conocer el modelo y el hardware de los fotógrafos que lo usarán. No forman parte del
entorno base.

## Herramientas base

| Herramienta | Uso | Decisión |
|---|---|---|
| Git | Control de versiones | Ya instalado |
| Node.js 24 | Aplicación y auditor de recepción actuales | Ya instalado |
| uv | Python, entornos y lockfile reproducible | Instalado mediante WinGet |
| Python 3.12 | Motor fotográfico y de aprendizaje | Administrado por uv |
| ExifTool 13.59 | Lectura fiable de EXIF/XMP de múltiples cámaras | Instalado de forma portátil y verificado por SHA-256 |
| Adobe DNG Converter | Compatibilidad y previsualizaciones Adobe | Pospuesto; descarga aproximada de 1,7 GB |
| PyTorch | Modelos visuales profundos | Pospuesto hasta justificarlo |
| CUDA/ROCm | Aceleración de GPU | No instalar en este equipo |
| Visual Studio Build Tools | Compilar dependencias nativas | Solo si una dependencia sin wheel lo exige |

## Entorno Python del proyecto

El proyecto fija Python 3.12 en `.python-version`. `uv` crea `.venv` y mantiene
las versiones exactas en `uv.lock`.

Dependencias iniciales:

- `rawpy`: lectura de RAW mediante LibRaw.
- `Pillow`: imágenes y previsualizaciones.
- `NumPy`: matrices y características.
- `scikit-learn` y `joblib`: primeras líneas de base predictivas. Declaradas, pero
  todavía sin uso en el código del motor.
- `defusedxml`: lectura segura de XMP.
- `pydantic`: validación de contratos de datos. Declarada, pero todavía sin uso.
- `pytest` y `ruff`: pruebas y calidad.

PyTorch, OpenCV, pandas y herramientas de empaquetado no se agregan hasta tener
un caso real que las necesite.

## Reproducir el entorno

Desde PowerShell en la raíz:

```powershell
uv sync
npm test
uv run pytest
uv run ruff check engine engine-tests
```

Para ejecutar diagnóstico y todas las pruebas:

```powershell
.\scripts\check-environment.ps1
```

Para reinstalar la distribución oficial y portátil de ExifTool:

```powershell
.\scripts\install-exiftool.ps1
```

Para iniciar la interfaz:

```powershell
.\scripts\start-development.ps1
```

## Política de instalación

- Dependencias Python dentro de `.venv`, nunca en el Python global.
- Versiones exactas conservadas en `uv.lock`.
- Herramientas del sistema únicamente cuando resuelven una necesidad concreta.
- No instalar toolkits de GPU por anticipado.
- Registrar toda dependencia necesaria para que otra PC pueda reproducir el
  proyecto.
