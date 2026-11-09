"""Características visuales económicas para la primera línea de base."""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def normalize_rgb(image: NDArray[np.generic]) -> NDArray[np.float32]:
    """Validate an RGB array and return it as float32 values between 0 and 1."""
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("La imagen debe tener forma alto × ancho × 3.")
    if image.size == 0:
        raise ValueError("La imagen no puede estar vacía.")

    if np.issubdtype(image.dtype, np.integer):
        maximum = np.iinfo(image.dtype).max
        normalized = image.astype(np.float32) / float(maximum)
    elif np.issubdtype(image.dtype, np.floating):
        normalized = image.astype(np.float32)
        if not np.isfinite(normalized).all():
            raise ValueError("La imagen contiene valores no finitos.")
        if normalized.min() < 0 or normalized.max() > 1:
            raise ValueError("Una imagen flotante debe estar normalizada entre 0 y 1.")
    else:
        raise ValueError(f"Tipo de imagen no soportado: {image.dtype}.")

    return np.clip(normalized, 0, 1)


def summarize_rgb(
    image: NDArray[np.generic],
    *,
    maximum_samples: int = 250_000,
) -> dict[str, float]:
    """Summarize global light and color without retaining image pixels."""
    rgb = normalize_rgb(image)
    pixels = rgb.reshape(-1, 3)

    if len(pixels) > maximum_samples:
        stride = max(1, len(pixels) // maximum_samples)
        pixels = pixels[::stride][:maximum_samples]

    luminance = (
        pixels[:, 0] * 0.2126
        + pixels[:, 1] * 0.7152
        + pixels[:, 2] * 0.0722
    )
    features: dict[str, float] = {
        "luminance_mean": float(np.mean(luminance)),
        "luminance_std": float(np.std(luminance)),
        "shadow_fraction": float(np.mean(luminance <= 0.05)),
        "highlight_fraction": float(np.mean(luminance >= 0.95)),
    }

    for index, channel in enumerate(("red", "green", "blue")):
        values = pixels[:, index]
        features[f"{channel}_mean"] = float(np.mean(values))
        features[f"{channel}_std"] = float(np.std(values))
        for percentile in (1, 5, 25, 50, 75, 95, 99):
            features[f"{channel}_p{percentile:02d}"] = float(
                np.percentile(values, percentile)
            )

    for percentile in (1, 5, 25, 50, 75, 95, 99):
        features[f"luminance_p{percentile:02d}"] = float(
            np.percentile(luminance, percentile)
        )

    epsilon = 1e-6
    features["red_green_ratio"] = float(
        (features["red_mean"] + epsilon) / (features["green_mean"] + epsilon)
    )
    features["blue_green_ratio"] = float(
        (features["blue_mean"] + epsilon) / (features["green_mean"] + epsilon)
    )
    return features
