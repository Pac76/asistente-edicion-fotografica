import pytest
from foto_engine.xmp import XmpReadError, parse_xmp_text

SAMPLE_XMP = """<?xpacket begin="﻿" id="test"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:ProcessVersion="15.4"
      crs:CameraProfile="Adobe Color"
      crs:Temperature="4850"
      crs:Tint="+8"
      crs:Exposure2012="+0.45"
      crs:Contrast2012="-5"
      crs:Highlights2012="-32">
      <crs:Saturation>3</crs:Saturation>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>"""


def test_normalizes_numeric_and_categorical_values() -> None:
    edit = parse_xmp_text(SAMPLE_XMP)

    assert edit.numeric["temperature"] == 4850.0
    assert edit.numeric["exposure"] == 0.45
    assert edit.numeric["highlights"] == -32.0
    assert edit.numeric["saturation"] == 3.0
    assert edit.categorical["camera_profile"] == "Adobe Color"
    assert edit.categorical["process_version"] == "15.4"


def test_prefers_current_process_aliases() -> None:
    text = SAMPLE_XMP.replace(
        'crs:Exposure2012="+0.45"',
        'crs:Exposure="+1.0" crs:Exposure2012="+0.25"',
    )

    assert parse_xmp_text(text).numeric["exposure"] == 0.25


def test_rejects_invalid_or_irrelevant_xml() -> None:
    with pytest.raises(XmpReadError, match="XMP/XML inválido"):
        parse_xmp_text("<broken>")

    with pytest.raises(XmpReadError, match="No se encontraron"):
        parse_xmp_text("<document />")
