"""Lectura por lotes de metadata fotográfica mediante ExifTool."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections.abc import Iterable
from pathlib import Path

EXIFTOOL_TAGS = (
    "FileType",
    "Make",
    "Model",
    "LensModel",
    "ISO",
    "FNumber",
    "ExposureTime",
    "FocalLength",
    "DateTimeOriginal",
    "ColorSpace",
    "ProfileName",
)


class MetadataReadError(RuntimeError):
    """Raised when ExifTool cannot return a valid metadata response."""


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def find_exiftool() -> Path | None:
    """Find an explicit, PATH or project-portable ExifTool executable."""
    explicit = os.environ.get("EXIFTOOL_PATH")
    if explicit and Path(explicit).is_file():
        return Path(explicit).resolve()

    executable = shutil.which("exiftool")
    if executable:
        return Path(executable).resolve()

    tool_root = project_root() / "tools" / "exiftool"
    if tool_root.is_dir():
        match = next(tool_root.rglob("exiftool.exe"), None)
        if match:
            return match.resolve()
    return None


def chunked(values: list[Path], size: int) -> Iterable[list[Path]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]


def read_metadata(paths: Iterable[str | Path], *, batch_size: int = 20) -> list[dict]:
    """Read selected tags with numeric values and no writes to source files."""
    executable = find_exiftool()
    if not executable:
        raise MetadataReadError("No se encontró ExifTool.")

    sources = [Path(value).resolve() for value in paths]
    if not sources:
        return []

    results: list[dict] = []
    for batch in chunked(sources, batch_size):
        environment = os.environ.copy()
        if os.name == "nt":
            environment["PERL_BADLANG"] = "0"
        command = [
            str(executable),
            "-json",
            "-n",
            *(f"-{tag}" for tag in EXIFTOOL_TAGS),
            *(str(source) for source in batch),
        ]
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            env=environment,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if completed.returncode not in (0, 1):
            raise MetadataReadError(
                completed.stderr.strip()
                or f"ExifTool terminó con código {completed.returncode}."
            )
        try:
            payload = json.loads(completed.stdout)
        except json.JSONDecodeError as error:
            raise MetadataReadError("ExifTool devolvió JSON inválido.") from error
        if not isinstance(payload, list):
            raise MetadataReadError("ExifTool devolvió una estructura inesperada.")
        results.extend(payload)

    return results
