import pytest


def find_alert(alerts_config, alert_name):
    for group in alerts_config.get("groups", []):
        for rule in group.get("rules", []):
            if rule.get("alert") == alert_name:
                return rule
    return None


def test_tti_p95_alert_exists(alerts_config):
    rule = find_alert(alerts_config, "TTIP95SustainedHigh")
    assert rule is not None, "Expected alert 'TTIP95SustainedHigh' to be defined"


def test_alert_sustained_threshold_1hour(alerts_config):
    """
    TRIOFSND-55: Alert must trigger only after TTI p95 > 2s sustained for 1 hour.
    Aggregation window must be 60m, not 45m.
    """
    rule = find_alert(alerts_config, "TTIP95SustainedHigh")
    assert rule is not None, "Expected alert 'TTIP95SustainedHigh' to be defined"

    expr = rule.get("expr", "")
    assert "tti_p95" in expr, "Alert expression must reference tti_p95 metric"
    assert "> 2" in expr or ">2" in expr, "Alert threshold must be > 2s"

    for_clause = rule.get("for")
    assert for_clause is not None, "Alert must define a 'for' sustained duration"

    assert for_clause != "45m", (
        "Aggregation window misconfigured — expected 60m, got 45m"
    )
    assert for_clause == "60m" or for_clause == "1h", (
        f"Expected sustained window of 60m, got {for_clause}"
    )


def test_alert_threshold_value(alerts_config):
    rule = find_alert(alerts_config, "TTIP95SustainedHigh")
    assert rule is not None
    expr = rule["expr"]
    assert "tti_p95 > 2" in expr.replace(" ", "") or "tti_p95>2" in expr.replace(" ", ""), (
        "Expected threshold of 2 seconds for TTI p95"
    )


def test_alert_has_labels_and_severity(alerts_config):
    rule = find_alert(alerts_config, "TTIP95SustainedHigh")
    assert rule is not None
    labels = rule.get("labels", {})
    assert "severity" in labels, "Alert must define severity label"
    assert labels["severity"] in {"warning", "critical"}, (
        f"Unexpected severity: {labels.get('severity')}"
    )


def test_alert_has_runbook_annotation(alerts_config):
    rule = find_alert(alerts_config, "TTIP95SustainedHigh")
    assert rule is not None
    annotations = rule.get("annotations", {})
    assert "runbook_url" in annotations or "description" in annotations, (
        "Alert must include runbook or description annotation"
    )
