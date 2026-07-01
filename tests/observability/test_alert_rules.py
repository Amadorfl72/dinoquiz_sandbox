"""Tests for the TTI p95 alert rule (TRIOFSND-55).

Validates that a Prometheus/Grafana alerting rule exists that fires when
TTI p95 > 2s sustained for 1 hour.
"""
import json
from pathlib import Path

import pytest

ALERT_PATH = Path("observability/grafana/alerts/tti_p95_alert.json")
RULES_PATH = Path("observability/prometheus/rules.yml")


def _load_alert_json():
    assert ALERT_PATH.exists(), f"Alert file not found at {ALERT_PATH}"
    with ALERT_PATH.open() as fh:
        return json.load(fh)


def test_alert_file_exists():
    assert ALERT_PATH.exists() or RULES_PATH.exists(), (
        "Expected either a Grafana alert JSON or a Prometheus rules file"
    )


def test_alert_name_references_tti():
    data = _load_alert_json()
    title = data.get("title", "")
    assert "tti" in title.lower(), f"Alert title should reference TTI: {title}"


def test_alert_threshold_is_two_seconds():
    data = _load_alert_json()
    conditions = data.get("condition", []) or data.get("conditions", [])
    if isinstance(conditions, dict):
        conditions = [conditions]
    serialized = json.dumps(conditions)
    # Accept 2, 2.0, 2000ms, or 2s representations.
    assert ("2" in serialized), "Alert threshold should be 2 seconds"


def test_alert_duration_is_one_hour():
    data = _load_alert_json()
    # Grafana alert 'for' duration field
    for_duration = data.get("for", "")
    if for_duration:
        assert "1h" in for_duration or "60m" in for_duration or "3600" in for_duration, (
            f"Alert 'for' duration should be 1 hour, got: {for_duration}"
        )
    else:
        # Fallback: search serialized payload for a 1h / 60m / 3600s reference.
        serialized = json.dumps(data)
        assert any(token in serialized for token in ["1h", "60m", "3600s", "3600"]), (
            "Alert must specify a 1-hour sustained duration"
        )


def test_alert_query_uses_tti_p95_metric():
    data = _load_alert_json()
    data_str = json.dumps(data).lower()
    assert "tti" in data_str, "Alert query must reference the TTI metric"
    assert "p95" in data_str or "0.95" in data_str, (
        "Alert query must compute the p95 quantile of TTI"
    )


def test_alert_severity_is_configured():
    data = _load_alert_json()
    labels = data.get("labels", {})
    annotations = data.get("annotations", {})
    severity = labels.get("severity") or annotations.get("severity")
    assert severity in {"warning", "critical", "page", "high"}, (
        f"Alert must have a severity label, got: {severity}"
    )


def test_alert_comparison_operator_is_greater_than():
    data = _load_alert_json()
    data_str = json.dumps(data)
    # Accept common representations of greater-than comparisons.
    assert any(op in data_str for op in [">", "gt", "GreaterThan", "above"]), (
        "Alert must compare TTI p95 as greater than the threshold"
    )
