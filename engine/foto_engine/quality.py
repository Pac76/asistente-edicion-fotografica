"""Calidad técnica por fotografía: desenfoque y exposición.

Calcula métricas objetivas sobre una previsualización y las convierte en
advertencias legibles. Es la base de la selección (culling) y no modifica
ningún archivo analizado.

Los umbrales por defecto son un punto de partida sin calibrar: dependen del
estilo del fotógrafo (una escena nocturna oscura es válida) y deben ajustarse
con fotografías etiquetadas por él. Por eso son configurables por perfil.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image

from foto_engine.image_features import normalize_rgb
from foto_engine.raw_preview import read_raw_preview

RAW_EXTENSIONS = frozenset(
    {
        ".3fr", ".arw", ".cr2", ".cr3", ".dng", ".fff", ".iiq", ".nef",
        ".nrw", ".orf", ".pef", ".raf", ".raw", ".rw2", ".srw",
    }
)  # fmt: skip
IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".tif", ".tiff"})

ANALYSIS_SIZE = 1600
TILE_GRID = 6
MINIMUM_SIDE = 24
CONTRAST_FLOOR = 0.05

FLAG_BLURRY = "desenfocada"
FLAG_UNDEREXPOSED = "subexpuesta"
FLAG_OVEREXPOSED = "sobreexpuesta"
FLAG_CLIPPED_HIGHLIGHTS = "luces_quemadas"
FLAG_CRUSHED_SHADOWS = "sombras_tapadas"
FLAG_LOW_CONTRAST = "bajo_contraste"


class UnsupportedFormatError(ValueError):
    """Raised when a file extension is neither a known RAW nor a common image."""


@dataclass(frozen=True)
class QualityThresholds:
    """Límites para convertir métricas en advertencias.

    La nitidez se mide como varianza del Laplaciano en escala 0-255 sobre una
    imagen de hasta 1600 px. La nitidez relativa la divide por el cuadrado del
    contraste global, para no confundir una foto oscura o plana con una
    desenfocada. La luminancia va de 0 (negro) a 1 (blanco) sobre la
    previsualización ya renderizada, no sobre el RAW lineal.
    """

    min_relative_sharpness: float = 40.0
    min_mean_luminance: float = 0.15
    max_mean_luminance: float = 0.80
    max_clipped_fraction: float = 0.05
    max_crushed_fraction: float = 0.30
    min_contrast_range: float = 0.25


@dataclass(frozen=True)
class QualityReport:
    """Métricas de una fotografía y las advertencias que disparan."""

    metrics: dict[str, float]
    flags: tuple[str, ...]

    @property
    def has_issues(self) -> bool:
        return bool(self.flags)

    def to_dict(self) -> dict[str, object]:
        return {"metrics": self.metrics, "flags": list(self.flags)}


def _as_uint8_rgb(image: NDArray[np.generic]) -> NDArray[np.uint8]:
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("La imagen debe tener forma alto × ancho × 3.")
    if image.size == 0:
        raise ValueError("La imagen no puede estar vacía.")
    if image.dtype == np.uint8:
        return image
    return np.rint(normalize_rgb(image) * 255).astype(np.uint8)


def _downscale(rgb: NDArray[np.uint8], longest_side: int) -> NDArray[np.uint8]:
    height, width = rgb.shape[:2]
    scale = longest_side / max(height, width)
    if scale >= 1:
        return rgb
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return np.asarray(Image.fromarray(rgb).resize(size, Image.Resampling.BOX))


def _luminance_255(rgb: NDArray[np.uint8]) -> NDArray[np.float32]:
    pixels = rgb.astype(np.float32)
    return pixels[..., 0] * 0.2126 + pixels[..., 1] * 0.7152 + pixels[..., 2] * 0.0722


def _box_smooth(gray: NDArray[np.float32]) -> NDArray[np.float32]:
    """3×3 average that keeps pixel noise from being read as sharpness."""
    total = np.zeros((gray.shape[0] - 2, gray.shape[1] - 2), dtype=np.float32)
    for row in range(3):
        for column in range(3):
            total += gray[row : row + total.shape[0], column : column + total.shape[1]]
    return total / 9.0


def _laplacian(gray: NDArray[np.float32]) -> NDArray[np.float32]:
    center = gray[1:-1, 1:-1]
    return 4.0 * center - gray[:-2, 1:-1] - gray[2:, 1:-1] - gray[1:-1, :-2] - gray[1:-1, 2:]


def _tile_variances(values: NDArray[np.float32], grid: int) -> NDArray[np.float32]:
    tile_height = values.shape[0] // grid
    tile_width = values.shape[1] // grid
    trimmed = values[: tile_height * grid, : tile_width * grid]
    tiles = trimmed.reshape(grid, tile_height, grid, tile_width)
    return tiles.var(axis=(1, 3))


def measure_quality(
    image: NDArray[np.generic],
    *,
    analysis_size: int = ANALYSIS_SIZE,
) -> dict[str, float]:
    """Return sharpness and exposure metrics for an RGB image array."""
    rgb = _downscale(_as_uint8_rgb(image), analysis_size)
    if min(rgb.shape[:2]) < MINIMUM_SIDE:
        raise ValueError(f"La imagen es demasiado pequeña (mínimo {MINIMUM_SIDE} px por lado).")

    luminance = _luminance_255(rgb)
    laplacian = _laplacian(_box_smooth(luminance))
    tile_variance = _tile_variances(laplacian, TILE_GRID)
    unit = luminance / 255.0
    low, high = np.percentile(unit, (5, 95))
    contrast_range = float(high - low)
    sharpness_peak = float(np.percentile(tile_variance, 90))

    return {
        "sharpness_global": float(laplacian.var()),
        "sharpness_peak": sharpness_peak,
        "sharpness_relative": sharpness_peak / max(contrast_range, CONTRAST_FLOOR) ** 2,
        "luminance_mean": float(unit.mean()),
        "luminance_p05": float(low),
        "luminance_p95": float(high),
        "contrast_range": contrast_range,
        "clipped_fraction": float(np.mean(unit >= 0.98)),
        "crushed_fraction": float(np.mean(unit <= 0.02)),
    }


def flag_quality(metrics: dict[str, float], thresholds: QualityThresholds) -> tuple[str, ...]:
    """Translate metrics into readable warnings using the given thresholds."""
    checks = (
        (FLAG_BLURRY, metrics["sharpness_relative"] < thresholds.min_relative_sharpness),
        (FLAG_UNDEREXPOSED, metrics["luminance_mean"] < thresholds.min_mean_luminance),
        (FLAG_OVEREXPOSED, metrics["luminance_mean"] > thresholds.max_mean_luminance),
        (FLAG_CLIPPED_HIGHLIGHTS, metrics["clipped_fraction"] > thresholds.max_clipped_fraction),
        (FLAG_CRUSHED_SHADOWS, metrics["crushed_fraction"] > thresholds.max_crushed_fraction),
        (FLAG_LOW_CONTRAST, metrics["contrast_range"] < thresholds.min_contrast_range),
    )
    return tuple(flag for flag, triggered in checks if triggered)


def assess_quality(
    image: NDArray[np.generic],
    thresholds: QualityThresholds | None = None,
    *,
    analysis_size: int = ANALYSIS_SIZE,
) -> QualityReport:
    """Measure an RGB image and flag likely technical problems."""
    metrics = measure_quality(image, analysis_size=analysis_size)
    return QualityReport(metrics, flag_quality(metrics, thresholds or QualityThresholds()))


def read_image_file(path: str | Path, *, analysis_size: int = ANALYSIS_SIZE) -> NDArray[np.uint8]:
    """Read a RAW preview or a common image as RGB without touching the file."""
    source = Path(path)
    extension = source.suffix.lower()
    if extension in RAW_EXTENSIONS:
        return _as_uint8_rgb(read_raw_preview(source))
    if extension in IMAGE_EXTENSIONS:
        with Image.open(source) as image:
            image.draft("RGB", (analysis_size, analysis_size))
            return np.asarray(image.convert("RGB"))
    raise UnsupportedFormatError(f"Formato no soportado: {extension or '(sin extensión)'}.")


def assess_file(
    path: str | Path,
    thresholds: QualityThresholds | None = None,
    *,
    analysis_size: int = ANALYSIS_SIZE,
) -> QualityReport:
    """Assess one RAW or image file."""
    image = read_image_file(path, analysis_size=analysis_size)
    return assess_quality(image, thresholds, analysis_size=analysis_size)


def _list_photos(root: Path) -> list[Path]:
    supported = RAW_EXTENSIONS | IMAGE_EXTENSIONS
    return sorted(
        (path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in supported),
        key=lambda path: path.relative_to(root).as_posix().lower(),
    )


def assess_folder(
    folder: str | Path,
    thresholds: QualityThresholds | None = None,
    *,
    progress: Callable[[int, int, Path], None] | None = None,
) -> dict[str, object]:
    """Assess every RAW or image under a folder; one bad file never stops the rest."""
    root = Path(folder).resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"La ruta no es una carpeta: {root}")

    active = thresholds or QualityThresholds()
    paths = _list_photos(root)
    photos: list[dict[str, object]] = []
    flag_counts: Counter[str] = Counter()

    for position, path in enumerate(paths, start=1):
        relative = path.relative_to(root).as_posix()
        try:
            report = assess_file(path, active)
        except (OSError, ValueError, RuntimeError) as error:
            photos.append({"file": relative, "metrics": None, "flags": [], "error": str(error)})
        else:
            flag_counts.update(report.flags)
            photos.append({"file": relative, **report.to_dict(), "error": None})
        if progress:
            progress(position, len(paths), path)

    failed = sum(1 for photo in photos if photo["error"])
    return {
        "version": 1,
        "root": str(root),
        "assessed_at": datetime.now(UTC).isoformat(),
        "thresholds": asdict(active),
        "summary": {
            "files": len(photos),
            "assessed": len(photos) - failed,
            "errors": failed,
            "with_flags": sum(1 for photo in photos if photo["flags"]),
            "by_flag": dict(flag_counts),
        },
        "photos": photos,
    }


def _is_inside(path: Path, folder: Path) -> bool:
    try:
        path.resolve().relative_to(folder.resolve())
    except ValueError:
        return False
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m foto_engine.quality",
        description="Analiza desenfoque y exposición de las fotografías de una carpeta. "
        "Solo lee los archivos; no modifica nada.",
    )
    parser.add_argument("folder", help="Carpeta con RAW o imágenes (se recorre completa).")
    parser.add_argument(
        "--json",
        dest="json_path",
        help="Guarda el reporte completo en este archivo.",
    )
    parser.add_argument(
        "--min-sharpness",
        type=float,
        default=QualityThresholds.min_relative_sharpness,
        help="Nitidez mínima antes de marcar una foto como desenfocada.",
    )
    arguments = parser.parse_args(argv)

    root = Path(arguments.folder)
    if arguments.json_path and root.is_dir() and _is_inside(Path(arguments.json_path), root):
        parser.error("Guardá el reporte fuera de la carpeta analizada: no se modifica.")

    thresholds = QualityThresholds(min_relative_sharpness=arguments.min_sharpness)
    try:
        report = assess_folder(root, thresholds)
    except NotADirectoryError as error:
        parser.error(str(error))

    summary = report["summary"]
    print(f"Carpeta: {report['root']}")
    print(f"Fotos analizadas: {summary['assessed']} de {summary['files']}")
    print(f"Con advertencias: {summary['with_flags']}")
    for flag, count in sorted(summary["by_flag"].items(), key=lambda item: -item[1]):
        print(f"  {flag}: {count}")
    if summary["errors"]:
        print(f"No se pudieron leer: {summary['errors']}")

    if arguments.json_path:
        output = Path(arguments.json_path)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Reporte guardado: {output.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
