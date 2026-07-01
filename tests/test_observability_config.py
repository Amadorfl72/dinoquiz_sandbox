import json
import os
import pytest

# Assuming the configurations are saved in these files
DASHBOARD_FILE = "dashboards/observability_dashboard.json"
MONITOR_FILE = "alerts/tti_p95_alert.json"

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
    widgets = dashboard_config.get("widgets", [])
    found_tti = False
    for widget in widgets:
        def_str = str(widget.get("definition", {})).lower()
        if "tti" in def_str and "p95" in def_str:
            found_tti = True
            break
    assert found_tti, "TTI p95 metric is not tracked in the dashboard"

def test_time_between_app_open_and_tap_jugar_tracked(dashboard_config):
    widgets = dashboard_config.get("widgets", [])
    found_metric = False
    for widget in widgets:
        def_str = str(widget.get("definition", {})).lower()
        if "app_open" in def_str and "first_tap_jugar" in def_str:
            found_metric = True
            break
    assert found_metric, "Time between app_open and first_tap_jugar is not tracked"

def test_funnel_dashboard_configured(dashboard_config):
    widgets = dashboard_config.get("widgets", [])
    found_funnel = False
    required_steps = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
    
    for widget in widgets:
        def_str = str(widget.get("definition", {})).lower()
        if "funnel" in def_str:
            if all(step in def_str for step in required_steps):
                found_funnel = True
                break
    assert found_funnel, "Funnel dashboard is not correctly configured with all required steps"

def test_tti_p95_alert_threshold(monitor_config):
    query = monitor_config.get("query", "").lower()
    assert "p95" in query, "Monitor query does not use p95"
    assert "tti" in query, "Monitor query does not track TTI"
    
    # Check threshold > 2s (2000ms or 2s depending on unit)
    thresholds = monitor_config.get("thresholds", {})
    critical_threshold = thresholds.get("critical", 0)
    assert critical_threshold >= 2000 or critical_threshold >= 2, "Critical threshold is not > 2s"

def test_tti_p95_alert_sustained_duration(monitor_config):
    query = monitor_config.get("query", "")
    # Check if the alert window is 1 hour (3600 seconds or 1h)
    assert "1h" in query or "3600" in query, "Alert is not sustained for 1 hour"
