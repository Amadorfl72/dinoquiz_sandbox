import json
import os
import pytest

DASHBOARD_CONFIG_PATH = 'config/dashboard_config.json'
ALERTS_CONFIG_PATH = 'config/alerts_config.json'

def load_json(filepath):
    if not os.path.exists(filepath):
        pytest.skip(f"Config file {filepath} not found")
    with open(filepath, 'r') as f:
        return json.load(f)

def test_tti_p95_metric_tracked():
    config = load_json(DASHBOARD_CONFIG_PATH)
    widgets = config.get('widgets', [])
    queries = [w.get('query', '') for w in widgets]
    assert any('p95' in q and 'tti' in q.lower() for q in queries), "TTI p95 metric is not tracked in the dashboard"

def test_time_between_app_open_and_tap_jugar_tracked():
    config = load_json(DASHBOARD_CONFIG_PATH)
    widgets = config.get('widgets', [])
    queries = [w.get('query', '') for w in widgets]
    assert any('app_open' in q and 'tap_jugar' in q for q in queries), "Time between app_open and tap_jugar is not tracked"

def test_funnel_dashboard_events():
    config = load_json(DASHBOARD_CONFIG_PATH)
    funnel_widgets = [w for w in config.get('widgets', []) if w.get('type') == 'funnel']
    assert len(funnel_widgets) > 0, "Funnel dashboard widget is missing"
    
    funnel_steps = funnel_widgets[0].get('steps', [])
    actual_events = [s.get('event') for s in funnel_steps]
    expected_events = ['app_open', 'pantalla_inicio', 'tap_jugar', 'partida_iniciada']
    
    assert actual_events == expected_events, f"Funnel events mismatch. Expected {expected_events}, got {actual_events}"

def test_tti_p95_alert_threshold():
    config = load_json(ALERTS_CONFIG_PATH)
    alerts = config.get('alerts', [])
    tti_alert = next((a for a in alerts if 'tti' in a.get('name', '').lower()), None)
    
    assert tti_alert is not None, "TTI p95 alert is not configured"
    assert tti_alert.get('threshold') == 2000, "TTI p95 alert threshold should be 2000ms (2s)"

def test_tti_p95_alert_duration():
    config = load_json(ALERTS_CONFIG_PATH)
    alerts = config.get('alerts', [])
    tti_alert = next((a for a in alerts if 'tti' in a.get('name', '').lower()), None)
    
    assert tti_alert is not None, "TTI p95 alert is not configured"
    assert tti_alert.get('duration') == '1h', "TTI p95 alert duration should be sustained for 1 hour"
