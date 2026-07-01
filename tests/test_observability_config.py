import json
import os
import pytest

# Assuming the configurations are saved in these files
DASHBOARD_FILE = "monitoring/dashboards/dinoquiz-observability.json"
MONITOR_FILE = "monitoring/alerts/tti-p95-alert.json"

@pytest.fixture
def dashboard_config():
    if not os.path.exists(DASHBOARD_FILE):
        pytest.skip(f"{DASHBOARD_FILE} not found")
    with open(DASHBOARD_FILE) as f:
        return json.load(f)

@pytest.fixture
def monitor_config():
    if not os.path.exists(MONITOR_FILE):
        pytest.skip(f"{MONITOR_FILE} not found")
    with open(MONITOR_FILE) as f:
        return json.load(f)

def test_tti_p95_metric_tracked(dashboard_config):
    panels = dashboard_config.get("panels", [])
    found_tti = False
    for panel in panels:
        if "TTI p95" in panel.get("title", ""):
            found_tti = True
            break
    assert found_tti, "TTI p95 metric is not tracked in the dashboard"

def test_time_between_app_open_and_tap_jugar_tracked(dashboard_config):
    panels = dashboard_config.get("panels", [])
    found_metric = False
    for panel in panels:
        if "Time between app_open and first_tap_jugar" in panel.get("title", ""):
            found_metric = True
            break
    assert found_metric, "Time between app_open and first_tap_jugar is not tracked"

def test_funnel_dashboard_configured(dashboard_config):
    panels = dashboard_config.get("panels", [])
    found_funnel = False
    required_steps = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
    
    for panel in panels:
        if "User Funnel" in panel.get("title", ""):
            targets = panel.get("targets", [])
            target_exprs = [t.get("expr", "") for t in targets]
            if all(any(step in expr for expr in target_exprs) for step in required_steps):
                found_funnel = True
                break
    assert found_funnel, "Funnel dashboard is not correctly configured with all required steps"

def test_tti_p95_alert_threshold(monitor_config):
    query = monitor_config.get("query", "").lower()
    assert "p95" in query, "Monitor query does not use p95"
    assert "tti" in query, "Monitor query does not track TTI"
    
    # Check threshold > 2s
    threshold = monitor_config.get("threshold", 0)
    assert threshold >= 2, "Critical threshold is not > 2s"

def test_tti_p95_alert_sustained_duration(monitor_config):
    duration = monitor_config.get("duration_minutes", 0)
    # Check if the alert window is 60 minutes (1 hour)
    assert duration == 60, "Alert is not sustained for 1 hour"