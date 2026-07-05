import json
import os
import re

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IGNORED_DIRS = {"node_modules", ".git", ".github"}


def _walk_files(predicate):
    matches = []
    for dirpath, dirnames, filenames in os.walk(REPO_ROOT):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]
        for filename in filenames:
            if predicate(filename.lower()):
                matches.append(os.path.join(dirpath, filename))
    return sorted(matches)


def _load_json_files(paths):
    documents = []
    for path in paths:
        with open(path, "r", encoding="utf-8") as handle:
            try:
                documents.append(json.load(handle))
            except json.JSONDecodeError:
                continue
    return documents


def _find_alert_rule_files():
    return _walk_files(lambda name: "alert" in name and name.endswith(".json"))


def _find_dashboard_files():
    return _walk_files(lambda name: "dashboard" in name and name.endswith(".json"))


def _extract_rules(documents):
    """Flatten every alerting rule across all alert documents into dicts with
    normalized name/expr/for/labels/annotations keys, supporting both the
    Prometheus-style groups/rules schema and the legacy flat alerts schema."""
    rules = []
    for document in documents:
        for group in document.get("groups", []):
            for rule in group.get("rules", []):
                rules.append({
                    "name": rule.get("alert", ""),
                    "expr": rule.get("expr", ""),
                    "for": rule.get("for", ""),
                    "labels": rule.get("labels", {}) or {},
                    "annotations": rule.get("annotations", {}) or {},
                })
        for alert in document.get("alerts", []):
            rules.append({
                "name": alert.get("name", ""),
                "expr": alert.get("condition", ""),
                "for": alert.get("for", ""),
                "labels": alert.get("labels", {}) or {},
                "annotations": alert.get("annotations", {}) or {},
            })
    return rules


def _extract_panels(documents):
    panels = []
    for document in documents:
        panels.extend(document.get("panels", []))
    return panels


def _panel_text(panel):
    parts = [
        str(panel.get("title", "")),
        str(panel.get("description", "")),
        " ".join(str(step) for step in panel.get("steps", [])),
    ]
    for target in panel.get("targets", []):
        parts.append(str(target.get("expr", "")))
        parts.append(str(target.get("legendFormat", "")))
    return " ".join(parts).lower()


@pytest.fixture(scope="module")
def alert_rules():
    return _extract_rules(_load_json_files(_find_alert_rule_files()))


@pytest.fixture(scope="module")
def dashboard_panels():
    return _extract_panels(_load_json_files(_find_dashboard_files()))


@pytest.fixture(scope="module")
def tti_alert(alert_rules):
    for rule in alert_rules:
        haystack = f"{rule['name']} {rule['expr']}".lower()
        if "tti" in haystack and "p95" in haystack:
            return rule
    return None


@pytest.fixture(scope="module")
def tti_p95_panel(dashboard_panels):
    for panel in dashboard_panels:
        text = _panel_text(panel)
        if "tti" in text and "p95" in text:
            return panel
    return None


@pytest.fixture(scope="module")
def time_between_panel(dashboard_panels):
    for panel in dashboard_panels:
        text = _panel_text(panel)
        if "app_open" in text and "tap_jugar" in text:
            return panel
    return None


@pytest.fixture(scope="module")
def funnel_panel(dashboard_panels):
    for panel in dashboard_panels:
        if "funnel" in str(panel.get("title", "")).lower():
            return panel
    return None


class TestAlertExistence:
    def test_at_least_one_alert_rule_exists(self, alert_rules):
        assert len(alert_rules) > 0, "No alert rules found"

    def test_tti_p95_alert_exists(self, tti_alert):
        assert tti_alert is not None, "No alert rule found for TTI p95"


class TestTTIP95Threshold:
    def test_alert_threshold_is_2_seconds(self, tti_alert):
        assert tti_alert is not None, "No alert rule found for TTI p95"
        assert re.search(r">\s*(2000|2(\.0+)?)(?!\d)", tti_alert["expr"]), (
            "TTI p95 alert threshold must be > 2s (or > 2000ms)"
        )

    def test_alert_uses_greater_than_operator(self, tti_alert):
        assert tti_alert is not None, "No alert rule found for TTI p95"
        assert ">" in tti_alert["expr"], "TTI p95 alert must use a '>' comparison operator"


class TestAlertDuration:
    def test_alert_sustained_for_1_hour(self, tti_alert):
        assert tti_alert is not None, "No alert rule found for TTI p95"
        for_value = str(tti_alert.get("for", "")).strip()
        expr = tti_alert.get("expr", "")
        assert for_value == "1h" or "[1h]" in expr, (
            "TTI p95 alert must be sustained for 1 hour (for: 1h or [1h] range vector)"
        )


class TestAlertMetadata:
    def test_tti_alert_has_runbook(self, tti_alert):
        assert tti_alert is not None, "No alert rule found for TTI p95"
        annotations = tti_alert.get("annotations", {})
        labels = tti_alert.get("labels", {})
        haystack = " ".join(str(v) for v in list(annotations.values()) + list(labels.values())).lower()
        assert "runbook" in haystack, "TTI p95 alert should reference a runbook in annotations or labels"


class TestDashboardExistence:
    def test_at_least_one_dashboard_exists(self):
        assert len(_find_dashboard_files()) > 0, "No dashboard JSON files found"


class TestTTIP95Panel:
    def test_tti_p95_panel_exists(self, tti_p95_panel):
        assert tti_p95_panel is not None, "No panel found tracking TTI p95"

    def test_tti_p95_panel_uses_quantile(self, tti_p95_panel):
        assert tti_p95_panel is not None, "No panel found tracking TTI p95"
        text = _panel_text(tti_p95_panel)
        assert "quantile" in text or "p95" in text, (
            "TTI p95 panel should use a quantile/p95 aggregation"
        )


class TestTimeBetweenAppOpenAndTapJugarPanel:
    def test_time_between_panel_exists(self, time_between_panel):
        assert time_between_panel is not None, (
            "No panel found tracking time between app_open and first_tap_jugar"
        )

    def test_time_between_panel_references_both_events(self, time_between_panel):
        assert time_between_panel is not None, (
            "No panel found tracking time between app_open and first_tap_jugar"
        )
        text = _panel_text(time_between_panel)
        assert "app_open" in text and "tap_jugar" in text, (
            "Time-between panel must reference both app_open and tap_jugar events"
        )


class TestFunnelDashboard:
    def test_funnel_panel_exists(self, funnel_panel):
        assert funnel_panel is not None, "No panel with 'funnel' in the title found"

    def test_funnel_panel_references_all_steps(self, funnel_panel):
        assert funnel_panel is not None, "No funnel panel found"
        text = _panel_text(funnel_panel)
        required_steps = ["app_open", "game_started", "game_completed", "replay"]
        missing = [step for step in required_steps if step not in text]
        assert not missing, f"No funnel panel found referencing all steps; missing: {missing}"
