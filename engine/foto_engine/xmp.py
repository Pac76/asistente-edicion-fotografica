"""Lectura segura y normalización de ajustes globales de Adobe Camera Raw."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from defusedxml import ElementTree

NUMERIC_ALIASES = {
    "temperature": ("Temperature",),
    "tint": ("Tint",),
    "exposure": ("Exposure2012", "Exposure"),
    "contrast": ("Contrast2012", "Contrast"),
    "highlights": ("Highlights2012",),
    "shadows": ("Shadows2012",),
    "whites": ("Whites2012",),
    "blacks": ("Blacks2012",),
    "texture": ("Texture",),
    "clarity": ("Clarity2012", "Clarity"),
    "dehaze": ("Dehaze",),
    "vibrance": ("Vibrance",),
    "saturation": ("Saturation",),
}

CATEGORICAL_ALIASES = {
    "camera_profile": ("CameraProfile",),
    "process_version": ("ProcessVersion",),
    "white_balance": ("WhiteBalance",),
}

KNOWN_NAMES = {
    alias
    for aliases in (*NUMERIC_ALIASES.values(), *CATEGORICAL_ALIASES.values())
    for alias in aliases
}


class XmpReadError(ValueError):
    """Raised when a sidecar cannot be interpreted safely."""


@dataclass(frozen=True)
class XmpEdit:
    """Normalized edit values plus the original Adobe names."""

    numeric: dict[str, float]
    categorical: dict[str, str]
    raw_values: dict[str, str]


def local_name(qualified_name: str) -> str:
    """Remove an XML namespace or prefix from a tag/attribute name."""
    if "}" in qualified_name:
        return qualified_name.rsplit("}", 1)[1]
    if ":" in qualified_name:
        return qualified_name.rsplit(":", 1)[1]
    return qualified_name


def collect_known_values(root: ElementTree.Element) -> dict[str, str]:
    """Collect Camera Raw values from RDF attributes and element text."""
    values: dict[str, str] = {}

    for element in root.iter():
        for qualified_name, value in element.attrib.items():
            name = local_name(qualified_name)
            if name in KNOWN_NAMES:
                values[name] = value.strip()

        name = local_name(element.tag)
        if name in KNOWN_NAMES and element.text:
            values[name] = element.text.strip()

    return values


def first_value(values: dict[str, str], aliases: tuple[str, ...]) -> str | None:
    for alias in aliases:
        if alias in values:
            return values[alias]
    return None


def parse_xmp_text(text: str) -> XmpEdit:
    """Parse an XMP document without resolving entities or external resources."""
    try:
        root = ElementTree.fromstring(text)
    except (ElementTree.ParseError, ValueError) as error:
        raise XmpReadError(f"XMP/XML inválido: {error}") from error

    raw_values = collect_known_values(root)
    if not raw_values:
        raise XmpReadError("No se encontraron ajustes globales de Camera Raw.")

    numeric: dict[str, float] = {}
    for normalized_name, aliases in NUMERIC_ALIASES.items():
        value = first_value(raw_values, aliases)
        if value is None:
            continue
        try:
            numeric[normalized_name] = float(value)
        except ValueError:
            continue

    categorical = {
        normalized_name: value
        for normalized_name, aliases in CATEGORICAL_ALIASES.items()
        if (value := first_value(raw_values, aliases)) is not None
    }

    return XmpEdit(
        numeric=numeric,
        categorical=categorical,
        raw_values=raw_values,
    )


def read_xmp(path: str | Path) -> XmpEdit:
    """Read an Adobe XMP sidecar from disk."""
    source = Path(path)
    try:
        text = source.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError) as error:
        raise XmpReadError(f"No se pudo leer {source.name}: {error}") from error
    return parse_xmp_text(text)
