"""
Automated tests for TRIOFSND-55: Observability Dashboards and Alerts Setup

These tests validate the Grafana dashboard and alert rule configuration files
that track:
  - TTI p95
  - Time between app_open and first_tap_jugar
  - Funnel: app_open -> pantalla_inicio -> tap_jugar -> partida_iniciada
  - Alert: TTI p95 > 2s sustained for 1 hour
"""

import json
import os
import pytest


DASHBOARDS_DIR = os.environ.get("DASHBOARDS_DIR", "observability/dashboards")
ALERTS_DIR = os.environ.get("ALERTS_DIR", "observability/alerts")


def _load_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _find_dashboard_by_title(title):
    for root, _dirs, files in os.walk(DASHBOARDS_DIR):
        for fname in files:
            if not fname.endswith(".json"):
                continue
            data = _load_json(os.path.join(root, fname))
            if data.get("title") == title:
                return data
    return None


def _find_alert_rule(name):
    for root, _dirs, files in os.walk(ALERTS_DIR):
        for fname in files:
            if not fname.endswith(".json"):
                continue
            data = _load_json(os.path.join(root, fname))
            rules = data if isinstance(data, list) else data.get("rules", [])
            for rule in rules:
                if rule.get("name") == name or rule.get("alert", "").get("name") == name:
                    return rule
    return None


# ---------------------------------------------------------------------------
# Dashboard existence
# ---------------------------------------------------------------------------

class TestDashboardExistence:
    def test_tti_dashboard_exists(self):
        dash = _find_dashboard_by_title("TTI - Time to Interaction")
        assert dash is not None, "TTI dashboard not found"

    def test_funnel_dashboard_exists(self):
        dash = _find_dashboard_by_title("Funnel - Onboarding")
        assert dash is not None, "Funnel dashboard not found"


# ---------------------------------------------------------------------------
# TTI p95 panel
# ---------------------------------------------------------------------------

class TestTTIP95Panel:
    @pytest.fixture(scope="class")
    def dashboard(self):
        dash = _find_dashboard_by_title("TTI - Time to Interaction")
        assert dash is not None
        return dash

    def _find_panel_by_title(self, dashboard, title):
        for panel in dashboard.get("panels", []):
            if panel.get("title") == title:
                return panel
        return None

    def test_tti_p95_panel_exists(self, dashboard):
        panel = self._find_panel_by_title(dashboard, "TTI p95")
        assert panel is not None, "TTI p95 panel missing"

    def test_tti_p95_panel_uses_p95_aggregation(self, dashboard):
        panel = self._find_panel_by_title(dashboard, "TTI p95")
        assert panel is not None
        targets = panel.get("targets", [])
        assert len(targets) > 0
        expr = json.dumps(targets).lower()
        assert "p95" in expr or "quantile(0.95" in expr, \
            "TTI p95 panel must use p95 / quantile(0.95) aggregation"

    def test_tti_p95_panel_queries_tti_metric(self, dashboard):
        panel = self._find_panel_by_title(dashboard, "TTI p95")
        assert panel is not None
        expr = json.dumps(panel.get("targets", [])).lower()
        assert "tti" in expr, "TTI p95 panel must reference the tti metric"


# ---------------------------------------------------------------------------
# Time between app_open and first_tap_jugar
# ---------------------------------------------------------------------------

class TestAppOpenToTapJugarPanel:
    @pytest.fixture(scope="class")
    def dashboard(self):
        dash = _find_dashboard_by_title("TTI - Time to Interaction")
        assert dash is not None
        return dash

    def _find_panel(self, dashboard):
        for panel in dashboard.get("panels", []):
            title = panel.get("title", "").lower()
            if "app_open" in title and "tap_jugar" in title:
                return panel
        return None

    def test_panel_exists(self, dashboard):
        panel = self._find_panel(dashboard)
        assert panel is not None, \
            "Panel for time between app_open and first_tap_jugar is missing"

    def test_panel_references_both_events(self, dashboard):
        panel = self._find_panel(dashboard)
        assert panel is not None
        expr = json.dumps(panel.get("targets", [])).lower()
        assert "app_open" in expr, "Panel must reference app_open event"
        assert "tap_jugar" in expr or "first_tap_jugar" in expr, \
            "Panel must reference tap_jugar / first_tap_jugar event"


# ---------------------------------------------------------------------------
# Funnel dashboard
# ---------------------------------------------------------------------------

class TestFunnelDashboard:
    EXPECTED_STEPS = [
        "app_open",
        "pantalla_inicio",
        "tap_jugar",
        "partida_iniciada",
    ]

    @pytest.fixture(scope="class")
    def dashboard(self):
        dash = _find_dashboard_by_title("Funnel - Onboarding")
        assert dash is not None
        return dash

    def test_funnel_panel_exists(self, dashboard):
        funnel_panels = [
            p for p in dashboard.get("panels", [])
            if "funnel" in p.get("title", "").lower()
            or p.get("type") == "funnel"
        ]
        assert len(funnel_panels) > 0, "No funnel panel found in funnel dashboard"

    def test_funnel_includes_all_steps(self, dashboard):
        expr = json.dumps(dashboard).lower()
        for step in self.EXPECTED_STEPS:
            assert step in expr, f"Funnel dashboard missing step: {step}"

    def test_funnel_steps_in_order(self, dashboard):
        text = json.dumps(dashboard).lower()
        positions = [text.find(step) for step in self.EXPECTED_STEPS]
        assert all(pos != -1 for pos in positions), "Not all funnel steps present"
        assert positions == sorted(positions), \
            "Funnel steps must appear in order: app_open -> pantalla_inicio -> tap_jugar -> partida_iniciada"


# ---------------------------------------------------------------------------
# Alert: TTI p95 > 2s sustained for 1 hour
# ---------------------------------------------------------------------------

class TestTTIP95Alert:
    ALERT_NAME = "TTI p95 > 2s sustained 1h"

    @pytest.fixture(scope="class")
    def alert_rule(self):
        rule = _find_alert_rule(self.ALERT_NAME)
        assert rule is not None, f"Alert rule '{self.ALERT_NAME}' not found"
        return rule

    def test_alert_exists(self, alert_rule):
        assert alert_rule is not None

    def test_alert_threshold_is_2_seconds(self, alert_rule):
        blob = json.dumps(alert_rule)
        # Accept 2, 2.0, 2000ms representations
        assert ("2" in blob), "Alert threshold must reference 2 seconds"

    def test_alert_sustained_for_1_hour(self, alert_rule):
        blob = json.dumps(alert_rule).lower()
        assert ("1h" in blob or "3600" in blob or "60m" in blob), \
            "Alert must be sustained for 1 hour (1h / 3600s / 60m)"

    def test_alert_uses_p95_aggregation(self, alert_rule):
        blob = json.dumps(alert_rule).lower()
        assert ("p95" in blob or "quantile(0.95" in blob), \
            "Alert must use p95 aggregation"

    def test_alert_queries_tti_metric(self, alert_rule):
        blob = json.dumps(alert_rule).lower()
        assert "tti" in blob, "Alert must reference the TTI metric"

    def test_alert_severity_is_warning_or_critical(self, alert_rule):
        labels = alert_rule.get("labels", {})
        severity = labels.get("severity", "").lower()
        if not severity:
            # Try nested alert field
            severity = alert_rule.get("alert", {}).get("labels", {}).get("severity", "").lower()
        assert severity in ("warning", "critical"), \
            f"Alert severity must be warning or critical, got: {severity}"
