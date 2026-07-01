import json
import os
import pytest

DASHBOARD_FILE = os.path.join(os.path.dirname(__file__), '..', 'config', 'dashboard.json')
ALERTS_FILE = os.path.join(os.path.dirname(__file__), '..', 'config', 'alerts.json')

@pytest.fixture(scope='module')
def dashboard_config():
    with open(DASHBOARD_FILE, 'r') as f:
        return json.load(f)

@pytest.fixture(scope='module')
def alerts_config():
    with open(ALERTS_FILE, 'r') as f:
        return json.load(f)

def test_dashboard_has_tti_p95_panel(dashboard_config):
    panels = dashboard_config.get('panels', [])
    found = False
    for panel in panels:
        title = panel.get('title', '').lower()
        if 'tti' in title and 'p95' in title:
            found = True
            break
    assert found, "Dashboard is missing a panel for TTI p95"

def test_dashboard_has_app_open_to_tap_jugar_panel(dashboard_config):
    panels = dashboard_config.get('panels', [])
    found = False
    for panel in panels:
        title = panel.get('title', '').lower()
        if 'app_open' in title and 'tap_jugar' in title:
            found = True
            break
    assert found, "Dashboard is missing a panel for time between app_open and first_tap_jugar"

def test_dashboard_has_funnel_panel(dashboard_config):
    panels = dashboard_config.get('panels', [])
    found = False
    expected_events = ['app_open', 'pantalla_inicio', 'tap_jugar', 'partida_iniciada']
    for panel in panels:
        title = panel.get('title', '').lower()
        if 'funnel' in title:
            targets = panel.get('targets', [])
            panel_queries = ' '.join([t.get('expr', '').lower() for t in targets])
            if all(event in panel_queries for event in expected_events):
                found = True
                break
    assert found, "Dashboard is missing a funnel panel for app_open -> pantalla_inicio -> tap_jugar -> partida_iniciada"

def test_alert_tti_p95_threshold(alerts_config):
    rules = alerts_config.get('groups', [{}])[0].get('rules', [])
    found = False
    for rule in rules:
        if 'tti' in rule.get('alert', '').lower() and 'p95' in rule.get('alert', '').lower():
            expr = rule.get('expr', '')
            # Check if threshold is > 2 seconds (2000ms or 2s)
            if '> 2' in expr or '> 2000' in expr:
                found = True
                break
    assert found, "Alert rule for TTI p95 > 2s is missing or threshold is incorrect"

def test_alert_tti_p95_duration(alerts_config):
    rules = alerts_config.get('groups', [{}])[0].get('rules', [])
    found = False
    for rule in rules:
        if 'tti' in rule.get('alert', '').lower() and 'p95' in rule.get('alert', '').lower():
            for_duration = rule.get('for', '')
            # Check if duration is 1 hour (1h, 60m, 3600s)
            if '1h' in for_duration or '60m' in for_duration or '3600s' in for_duration:
                found = True
                break
    assert found, "Alert rule for TTI p95 sustained for 1 hour is missing or duration is incorrect"
