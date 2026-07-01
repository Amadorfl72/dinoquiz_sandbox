"""Tests for the metric definitions backing the observability dashboards.

Ensures the metrics required by TRIOFSND-55 are defined and documented so
that dashboards and alerts have a stable contract.
"""
import json
from pathlib import Path

import pytest

METRICS_PATH = Path("observability/metrics/definitions.json")


@pytest.fixture(scope="module")
def metrics():
    assert METRICS_PATH.exists(), f"Metrics definitions not found at {METRICS_PATH}"
    with METRICS_PATH.open() as fh:
        return json.load(fh)


def _find_metric(metrics, name_substring):
    for metric in metrics.get("metrics", []):
        if name_substring in metric.get("name", ""):
            return metric
    return None


def test_tti_metric_defined(metrics):
    metric = _find_metric(metrics, "tti")
    assert metric is not None, "A TTI metric must be defined"
    assert metric.get("unit") in {"ms", "s", "seconds", "milliseconds"}, (
        "TTI metric must declare a time unit"
    )


def test_app_open_to_tap_jugar_metric_defined(metrics):
    metric = _find_metric(metrics, "app_open_to_tap_jugar")
    assert metric is not None, (
        "A metric for time between app_open and first tap_jugar must be defined"
    )


def test_funnel_events_defined(metrics):
    events = metrics.get("events", [])
    event_names = {e.get("name") for e in events}
    required = {"app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"}
    missing = required - event_names
    assert not missing, f"Missing funnel events in definitions: {missing}"


def test_funnel_event_order_documented(metrics):
    events = metrics.get("events", [])
    ordered = sorted(events, key=lambda e: e.get("order", 0))
    names = [e.get("name") for e in ordered if e.get("name") in {
        "app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"
    }]
    assert names == ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"], (
        f"Funnel events must be ordered correctly, got: {names}"
    )
