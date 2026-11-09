from pathlib import Path

from foto_engine.metadata import find_exiftool, read_metadata
from PIL import Image


def test_project_portable_exiftool_reads_an_image(tmp_path: Path) -> None:
    executable = find_exiftool()
    assert executable is not None
    assert executable.name == "exiftool.exe"

    image_path = tmp_path / "sample.jpg"
    Image.new("RGB", (4, 3), color=(20, 40, 60)).save(image_path)

    metadata = read_metadata([image_path])

    assert len(metadata) == 1
    assert metadata[0]["FileType"] == "JPEG"
    assert Path(metadata[0]["SourceFile"]).name == "sample.jpg"
