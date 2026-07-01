import pytest


EXPECTED_STAGES = [
    "app_open",
    "pantalla_inicio",
    "tap_jugar",
    "partida_iniciada",
]


def get_funnel_stages(funnel_dashboard):
    panels = funnel_dashboard.get("panels", [])
    for panel in panels:
        if panel.get("type") == "funnel" or panel.get("title", "").lower().startswith("funnel"):
            return panel.get("stages", [])
    return []


def test_funnel_dashboard_exists(funnel_dashboard):
    assert funnel_dashboard is not None, "Funnel dashboard must exist"


def test_funnel_includes_all_stages(funnel_dashboard):
    """
    TRIOFSND-55: Funnel dashboard must include 'pantalla_inicio' stage between
    app_open and tap_jugar. Expected 4 stages total.
    """
    stages = get_funnel_stages(funnel_dashboard)
    assert len(stages) == 4, (
        f"Expected 4 funnel stages, got {len(stages)}: {stages}"
    )
    assert stages == EXPECTED_STAGES, (
        f"Funnel stages mismatch. Expected {EXPECTED_STAGES}, got {stages}"
    )


def test_funnel_includes_pantalla_inicio(funnel_dashboard):
    stages = get_funnel_stages(funnel_dashboard)
    assert "pantalla_inicio" in stages, (
        "Funnel dashboard missing 'pantalla_inicio' stage"
    )


def test_pantalla_inicio_positioned_correctly(funnel_dashboard):
    stages = get_funnel_stages(funnel_dashboard)
    if "pantalla_inicio" not in stages:
        pytest.fail("pantalla_inicio stage missing")
    idx_pantalla = stages.index("pantalla_inicio")
    idx_app_open = stages.index("app_open")
    idx_tap_jugar = stages.index("tap_jugar")
    assert idx_app_open < idx_pantalla < idx_tap_jugar, (
        "'pantalla_inicio' must be positioned between 'app_open' and 'tap_jugar'"
    )


def test_funnel_no_duplicate_stages(funnel_dashboard):
    stages = get_funnel_stages(funnel_dashboard)
    assert len(stages) == len(set(stages)), (
        f"Funnel stages contain duplicates: {stages}"
    )


def test_funnel_panel_has_valid_datasource(funnel_dashboard):
    panels = funnel_dashboard.get("panels", [])
    funnel_panels = [
        p for p in panels
        if p.get("type") == "funnel" or p.get("title", "").lower().startswith("funnel")
    ]
    assert funnel_panels, "Funnel panel must exist"
    for panel in funnel_panels:
        assert panel.get("datasource"), (
            f"Funnel panel '{panel.get('title')}' must define a datasource"
        )
