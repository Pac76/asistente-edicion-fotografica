import json
from pathlib import Path

import numpy as np
import pytest
from foto_engine import quality
from foto_engine.quality import (
    FLAG_BLURRY,
    FLAG_CLIPPED_HIGHLIGHTS,
    FLAG_LOW_CONTRAST,
    FLAG_UNDEREXPOSED,
    QualityThresholds,
    UnsupportedFormatError,
    assess_file,
    assess_folder,
    assess_quality,
    main,
)
from PIL import Image, ImageFilter
from sklearn.datasets import load_sample_image


def photo() -> np.ndarray:
    """A real photograph bundled with scikit-learn (no network, no personal data)."""
    return load_sample_image("china.jpg")


def blurred(image: np.ndarray, radius: float) -> np.ndarray:
    return np.asarray(Image.fromarray(image).filter(ImageFilter.GaussianBlur(radius)))


def scaled(image: np.ndarray, factor: float) -> np.ndarray:
    return np.clip(image.astype(np.float32) * factor, 0, 255).astype(np.uint8)


def test_sharp_photo_is_clean_and_blurred_photo_is_flagged() -> None:
    sharp = assess_quality(photo())
    soft = assess_quality(blurred(photo(), 3))

    assert FLAG_BLURRY not in sharp.flags
    assert FLAG_BLURRY in soft.flags
    assert soft.metrics["sharpness_relative"] < sharp.metrics["sharpness_relative"] / 20


def test_dark_or_flat_photos_are_not_mistaken_for_blur() -> None:
    dark = assess_quality(scaled(photo(), 0.25))

    assert FLAG_UNDEREXPOSED in dark.flags
    assert FLAG_BLURRY not in dark.flags


def test_clipped_highlights_are_reported() -> None:
    report = assess_quality(scaled(photo(), 2.2))

    assert FLAG_CLIPPED_HIGHLIGHTS in report.flags
    assert report.metrics["clipped_fraction"] > 0.05


def test_sharp_subject_with_soft_background_is_not_blurry() -> None:
    base = photo()
    height, width = base.shape[:2]
    box = (width // 3, height // 4, 2 * width // 3, 3 * height // 4)
    composite = Image.fromarray(blurred(base, 4))
    composite.paste(Image.fromarray(base).crop(box), box)

    report = assess_quality(np.asarray(composite))

    assert FLAG_BLURRY not in report.flags
    assert report.metrics["sharpness_peak"] > 2 * report.metrics["sharpness_global"]


def test_flat_image_has_low_contrast() -> None:
    report = assess_quality(np.full((120, 160, 3), 128, dtype=np.uint8))

    assert FLAG_LOW_CONTRAST in report.flags
    assert report.has_issues


def test_thresholds_can_be_adjusted_per_profile() -> None:
    dark = scaled(photo(), 0.25)
    assert FLAG_UNDEREXPOSED in assess_quality(dark).flags

    night_profile = QualityThresholds(min_mean_luminance=0.05, min_contrast_range=0.10)

    assert assess_quality(dark, night_profile).flags == ()


def test_accepts_normalized_float_images() -> None:
    expected = assess_quality(photo()).metrics
    as_float = photo().astype(np.float32) / 255

    metrics = assess_quality(as_float).metrics

    assert metrics["luminance_mean"] == pytest.approx(expected["luminance_mean"], abs=0.01)


def test_rejects_invalid_images() -> None:
    with pytest.raises(ValueError, match="forma"):
        assess_quality(np.zeros((50, 50), dtype=np.uint8))
    with pytest.raises(ValueError, match="vacía"):
        assess_quality(np.zeros((0, 50, 3), dtype=np.uint8))
    with pytest.raises(ValueError, match="demasiado pequeña"):
        assess_quality(np.zeros((10, 10, 3), dtype=np.uint8))


def test_unsupported_extension_is_rejected(tmp_path: Path) -> None:
    source = tmp_path / "notas.txt"
    source.write_text("hola", encoding="utf-8")

    with pytest.raises(UnsupportedFormatError):
        assess_file(source)


def test_raw_files_are_read_through_the_embedded_preview(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = tmp_path / "DSC_0001.NEF"
    source.write_bytes(b"not a real raw")
    monkeypatch.setattr(quality, "read_raw_preview", lambda _path: photo())

    report = assess_file(source)

    assert FLAG_BLURRY not in report.flags


def test_folder_assessment_isolates_failures_and_never_modifies_sources(tmp_path: Path) -> None:
    folder = tmp_path / "sesion"
    (folder / "interior").mkdir(parents=True)
    Image.fromarray(photo()).save(folder / "nitida.jpg", quality=95)
    Image.fromarray(blurred(photo(), 3)).save(folder / "interior" / "movida.png")
    (folder / "rota.jpg").write_bytes(b"no es una imagen")
    (folder / "falsa.nef").write_bytes(b"raw")
    (folder / "notas.txt").write_text("ignorar", encoding="utf-8")
    before = {
        path: (path.read_bytes(), path.stat().st_mtime_ns)
        for path in folder.rglob("*")
        if path.is_file()
    }

    report = assess_folder(folder)

    summary = report["summary"]
    assert summary == {
        "files": 4,
        "assessed": 2,
        "errors": 2,
        "with_flags": 1,
        "by_flag": {FLAG_BLURRY: 1},
    }
    by_file = {photo_["file"]: photo_ for photo_ in report["photos"]}
    assert set(by_file) == {"falsa.nef", "interior/movida.png", "nitida.jpg", "rota.jpg"}
    assert by_file["rota.jpg"]["error"]
    assert by_file["falsa.nef"]["error"]
    assert by_file["interior/movida.png"]["flags"] == [FLAG_BLURRY]
    assert by_file["nitida.jpg"]["flags"] == []
    after = {
        path: (path.read_bytes(), path.stat().st_mtime_ns)
        for path in folder.rglob("*")
        if path.is_file()
    }
    assert after == before


def test_folder_assessment_requires_an_existing_folder(tmp_path: Path) -> None:
    with pytest.raises(NotADirectoryError):
        assess_folder(tmp_path / "no-existe")


def test_command_line_saves_a_report_outside_the_analyzed_folder(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    folder = tmp_path / "sesion"
    folder.mkdir()
    Image.fromarray(photo()).save(folder / "foto.jpg", quality=95)
    report_path = tmp_path / "reporte.json"

    assert main([str(folder), "--json", str(report_path)]) == 0

    saved = json.loads(report_path.read_text(encoding="utf-8"))
    assert saved["summary"]["assessed"] == 1
    assert "Fotos analizadas: 1 de 1" in capsys.readouterr().out

    with pytest.raises(SystemExit):
        main([str(folder), "--json", str(folder / "reporte.json")])
    assert not (folder / "reporte.json").exists()
