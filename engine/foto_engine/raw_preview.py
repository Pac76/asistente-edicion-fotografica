"""Extracción local de una previsualización RGB desde un archivo RAW."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import numpy as np
import rawpy
from PIL import Image

from foto_engine.image_features import summarize_rgb


class RawPreviewError(RuntimeError):
    """Raised when neither the embedded preview nor RAW decoding succeeds."""


def _thumbnail_to_rgb(thumbnail: rawpy.Thumbnail) -> np.ndarray:
    if thumbnail.format == rawpy.ThumbFormat.JPEG:
        with Image.open(BytesIO(thumbnail.data)) as image:
            return np.asarray(image.convert("RGB"))
    if thumbnail.format == rawpy.ThumbFormat.BITMAP:
        return np.asarray(thumbnail.data)
    raise RawPreviewError(f"Formato de miniatura no soportado: {thumbnail.format}.")


def read_raw_preview(path: str | Path) -> np.ndarray:
    """Prefer the embedded thumbnail and fall back to a half-size decode."""
    source = Path(path)
    try:
        with rawpy.imread(str(source)) as raw:
            try:
                return _thumbnail_to_rgb(raw.extract_thumb())
            except (rawpy.LibRawNoThumbnailError, RawPreviewError):
                return raw.postprocess(
                    half_size=True,
                    use_camera_wb=True,
                    no_auto_bright=True,
                    output_bps=8,
                )
    except (OSError, rawpy.LibRawError) as error:
        raise RawPreviewError(f"No se pudo leer {source.name}: {error}") from error


def extract_raw_features(path: str | Path) -> dict[str, float]:
    """Decode a lightweight preview and return global baseline features."""
    return summarize_rgb(read_raw_preview(path))
