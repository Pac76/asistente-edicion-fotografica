"""Diagnóstico reproducible del entorno del motor."""

from __future__ import annotations

import json
import os
import platform
import shutil
import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from foto_engine.metadata import find_exiftool

PACKAGES = (
    "defusedxml",
    "joblib",
    "numpy",
    "pillow",
    "pydantic",
    "rawpy",
    "scikit-learn",
)


def package_version(name: str) -> str | None:
    """Return the installed version without failing for optional packages."""
    try:
        return version(name)
    except PackageNotFoundError:
        return None


def build_environment_report() -> dict[str, object]:
    """Describe the runtime without reading user photographs."""
    return {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "cpu_count": os.cpu_count(),
        "project_root": str(Path(__file__).resolve().parents[2]),
        "external_tools": {
            "exiftool": str(find_exiftool()) if find_exiftool() else None,
            "Adobe DNG Converter": shutil.which("Adobe DNG Converter"),
        },
        "packages": {name: package_version(name) for name in PACKAGES},
    }


def main() -> None:
    """Print the environment report as machine-readable JSON."""
    print(json.dumps(build_environment_report(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
