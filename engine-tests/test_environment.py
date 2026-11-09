from foto_engine.environment import build_environment_report


def test_environment_report_contains_reproducibility_fields() -> None:
    report = build_environment_report()

    assert report["python"].startswith("3.12.")
    assert report["implementation"] == "CPython"
    assert isinstance(report["cpu_count"], int)
    assert report["cpu_count"] > 0
    assert report["packages"]["numpy"] is not None
