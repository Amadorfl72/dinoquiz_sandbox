import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

BASE_URL = "/api/v1/analytics/events"

def test_app_open_event_with_first_apertura_true():
    payload = {
        "event_type": "app_open",
        "first_apertura": True
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_app_open_event_with_first_apertura_false():
    payload = {
        "event_type": "app_open",
        "first_apertura": False
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_tooltip_shown_event():
    payload = {
        "event_type": "tooltip_shown"
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_tooltip_dismissed_event():
    payload = {
        "event_type": "tooltip_dismissed"
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_invalid_event_type():
    payload = {
        "event_type": "invalid_event"
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 422

def test_missing_event_type():
    payload = {}
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 422

def test_app_open_missing_first_apertura_flag():
    payload = {
        "event_type": "app_open"
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 422

def test_pii_rejection():
    # Ensure no PII is collected by rejecting extra fields that could contain PII
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_email": "test@example.com",
        "ip_address": "192.168.1.1",
        "user_id": "12345"
    }
    response = client.post(BASE_URL, json=payload)
    assert response.status_code == 422
