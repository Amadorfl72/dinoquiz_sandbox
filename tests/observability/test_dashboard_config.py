"""Tests for the observability dashboard configuration (TRIOFSND-55).

These tests validate that the Grafana dashboard JSON definition includes the
required panels:
  - TTI p95 panel
  - Time between app_open and first_tap_jugar panel
  - Funnel dashboard (app_open -> pantalla_inicio -> tap_jugar -> partida_iniciada)
"""
import json
from pathlib import Path

import pytest

DASHBOARD_PATH = Path("observability/grafana/dashboards/triofsnd.json")


@pytest.fixture(scope="module")
def dashboard_json():
    assert DASHBOARD_PATH.exists(), f"Dashboard file not found at {DASHBOARD_PATH}"
    with DASHBOARD_PATH.open() as fh:
        return json.load(fh)


def _panel_titles(dashboard_json):
    return [panel.get("title", "").lower() for panel in dashboard_json.get("panels", [])]


def _flatten_panels(panels):
    """Recursively flatten nested rows/panels."""
    flat = []
    for panel in panels:
        flat.append(panel)
        for sub in panel.get("panels", []) or []:
            flat.extend(_flatten_panels([sub]))
    return flat


def test_dashboard_file_exists():
    assert DASHBOARD_PATH.exists(), f"Expected dashboard at {DASHBOARD_PATH}"


def test_dashboard_has_title(dashboard_json):
    assert dashboard_json.get("title"), "Dashboard must have a title"
    assert "triofsnd" in dashboard_json["title"].lower()


def test_dashboard_has_tti_p95_panel(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    titles = [p.get("title", "").lower() for p in panels]
    assert any("tti" in t and "p95" in t for t in titles), (
        "Dashboard must include a TTI p95 panel"
    )


def test_tti_p95_panel_queries_tti_metric(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    tti_panel = next(
        (p for p in panels if "tti" in p.get("title", "").lower()
         and "p95" in p.get("title", "").lower()),
        None,
    )
    assert tti_panel is not None, "TTI p95 panel not found"
    targets = tti_panel.get("targets", [])
    assert targets, "TTI p95 panel must have at least one query target"
    combined_expr = " ".join(
        (t.get("expr") or t.get("query") or "").lower() for t in targets
    )
    assert "tti" in combined_expr, "TTI p95 panel must query a TTI metric"
    assert "p95" in combined_expr or "0.95" in combined_expr, (
        "TTI p95 panel must compute the p95 quantile"
    )


def test_dashboard_has_app_open_to_first_tap_jugar_panel(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    titles = [p.get("title", "").lower() for p in panels]
    assert any("app_open" in t and "tap_jugar" in t for t in titles), (
        "Dashboard must include a panel for time between app_open and first tap_jugar"
    )


def test_app_open_to_tap_jugar_panel_queries_duration(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    panel = next(
        (p for p in panels
         if "app_open" in p.get("title", "").lower()
         and "tap_jugar" in p.get("title", "").lower()),
        None,
    )
    assert panel is not None
    targets = panel.get("targets", [])
    assert targets, "app_open -> tap_jugar panel must have a query"
    combined = " ".join(
        (t.get("expr") or t.get("query") or "").lower() for t in targets
    )
    assert "app_open" in combined and "tap_jugar" in combined, (
        "Panel query must reference app_open and tap_jugar events"
    )


def test_dashboard_has_funnel_panel(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    titles = [p.get("title", "").lower() for p in panels]
    assert any("funnel" in t for t in titles), (
        "Dashboard must include a funnel panel"
    )


def test_funnel_panel_includes_all_steps(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    funnel_panel = next(
        (p for p in panels if "funnel" in p.get("title", "").lower()),
        None,
    )
    assert funnel_panel is not None, "Funnel panel not found"
    targets = funnel_panel.get("targets", [])
    assert targets, "Funnel panel must have query targets"
    combined = " ".join(
        (t.get("expr") or t.get("query") or "").lower() for t in targets
    )
    required_steps = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
    missing = [step for step in required_steps if step not in combined]
    assert not missing, f"Funnel panel is missing steps: {missing}"


def test_funnel_step_order_preserved(dashboard_json):
    panels = _flatten_panels(dashboard_json.get("panels", []))
    funnel_panel = next(
        (p for p in panels if "funnel" in p.get("title", "").lower()),
        None,
    )
    assert funnel_panel is not None
    # If the panel declares an explicit ordered list of steps, validate order.
    steps = funnel_panel.get("options", {}).get("steps") or funnel_panel.get("fieldConfig", {}).get("steps")
    if steps:
        labels = [s.get("label", "").lower() for s in steps]
        expected = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
        assert labels == expected, f"Funnel step order mismatch: {labels}"
