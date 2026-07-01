import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from src.analytics.analyticsService import handleAnalyticsEvent

 def test_track_app_open_first_time():
    result = handleAnalyticsEvent('app_open', {'first_apertura': True})
    assert result.get("status") == "success"

def test_track_app_open_not_first_time():
    result = handleAnalyticsEvent('app_open', {'first_apertura': False})
    assert result.get("status") == "success"

def test_track_tooltip_shown():
    result = handleAnalyticsEvent('tooltip_shown', {'tooltip_id': 'settings_help'})
    assert result.get("status") == "success"

def test_track_tooltip_dismissed():
    result = handleAnalyticsEvent('tooltip_dismissed', {'tooltip_id': 'settings_help'})
    assert result.get("status") == "success"

def test_track_invalid_event_type():
    try:
        handleAnalyticsEvent('invalid_event', {})
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "Invalid event type" in str(e)

def test_track_app_open_missing_first_apertura():
    try:
        handleAnalyticsEvent('app_open', {})
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "Invalid event data" in str(e)

def test_track_pii_email_rejected():
    try:
        handleAnalyticsEvent('app_open', {'first_apertura': True, 'user_email': 'test@example.com'})
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "PII detected" in str(e)

def test_track_pii_ip_address_rejected():
    try:
        handleAnalyticsEvent('tooltip_shown', {'tooltip_id': 'settings_help', 'ip_address': '192.168.1.1'})
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "PII detected" in str(e)

def test_track_pii_user_id_rejected():
    try:
        handleAnalyticsEvent('tooltip_dismissed', {'tooltip_id': 'settings_help', 'user_id': 'usr_12345'})
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "PII detected" in str(e)