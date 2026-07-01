import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from src.analytics.analyticsService import handleAnalyticsEvent

def test_app_open_event_with_first_apertura_true():
    payload = {
        "event_type": "app_open",
        "first_apertura": True
    }
    result = handleAnalyticsEvent(payload["event_type"], payload)
    assert result.get("status") == "success"

def test_app_open_event_with_first_apertura_false():
    payload = {
        "event_type": "app_open",
        "first_apertura": False
    }
    result = handleAnalyticsEvent(payload["event_type"], payload)
    assert result.get("status") == "success"

def test_tooltip_shown_event():
    payload = {
        "event_type": "tooltip_shown",
        "tooltip_id": "settings_help"
    }
    result = handleAnalyticsEvent(payload["event_type"], payload)
    assert result.get("status") == "success"

def test_tooltip_dismissed_event():
    payload = {
        "event_type": "tooltip_dismissed",
        "tooltip_id": "settings_help"
    }
    result = handleAnalyticsEvent(payload["event_type"], payload)
    assert result.get("status") == "success"

def test_invalid_event_type():
    payload = {
        "event_type": "invalid_event"
    }
    try:
        handleAnalyticsEvent(payload["event_type"], payload)
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "Invalid event type" in str(e)

def test_missing_event_type():
    payload = {}
    try:
        handleAnalyticsEvent(None, payload)
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "Invalid event type" in str(e)

def test_app_open_missing_first_apertura_flag():
    payload = {
        "event_type": "app_open"
    }
    try:
        handleAnalyticsEvent(payload["event_type"], payload)
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "Invalid event data" in str(e)

def test_pii_rejection():
    # Ensure no PII is collected by rejecting extra fields that could contain PII
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_email": "test@example.com",
        "ip_address": "192.168.1.1",
        "user_id": "12345"
    }
    try:
        handleAnalyticsEvent(payload["event_type"], payload)
        assert False, "Should have thrown an error"
    except Exception as e:
        assert "PII detected" in str(e)