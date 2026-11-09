import numpy as np
import pytest
from foto_engine.image_features import summarize_rgb


def test_summarizes_light_and_color_from_uint8_rgb() -> None:
    image = np.zeros((10, 10, 3), dtype=np.uint8)
    image[:, :, 0] = 255
    image[:, :, 1] = 128

    features = summarize_rgb(image)

    assert features["red_mean"] == pytest.approx(1.0)
    assert features["green_mean"] == pytest.approx(128 / 255)
    assert features["blue_mean"] == pytest.approx(0.0)
    assert 0 < features["luminance_mean"] < 1
    assert features["highlight_fraction"] == 0.0


def test_accepts_normalized_float_images() -> None:
    image = np.full((4, 5, 3), 0.5, dtype=np.float32)

    features = summarize_rgb(image)

    assert features["luminance_mean"] == pytest.approx(0.5)
    assert features["luminance_std"] == pytest.approx(0.0)


def test_rejects_invalid_shapes_and_float_ranges() -> None:
    with pytest.raises(ValueError, match="forma"):
        summarize_rgb(np.zeros((10, 10), dtype=np.uint8))

    with pytest.raises(ValueError, match="normalizada"):
        summarize_rgb(np.full((2, 2, 3), 2.0, dtype=np.float32))
