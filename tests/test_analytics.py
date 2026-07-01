import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def base_url():
    return "/api/v1/analytics/events"

def test_track_app_open_first_time(base_url):
    response = client.post(base_url, json={
        "event_type": "app_open",
        "first_apertura": True,
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_track_app_open_not_first_time(base_url):
    response = client.post(base_url, json={
        "event_type": "app_open",
        "first_apertura": False,
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_track_tooltip_shown(base_url):
    response = client.post(base_url, json={
        "event_type": "tooltip_shown",
        "tooltip_id": "settings_help",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_track_tooltip_dismissed(base_url):
    response = client.post(base_url, json={
        "event_type": "tooltip_dismissed",
        "tooltip_id": "settings_help",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_track_invalid_event_type(base_url):
    response = client.post(base_url, json={
        "event_type": "invalid_event",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 400
    assert "invalid" in response.json().get("detail", "").lower()

def test_track_app_open_missing_first_apertura(base_url):
    response = client.post(base_url, json={
        "event_type": "app_open",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 422

def test_track_pii_email_rejected(base_url):
    response = client.post(base_url, json={
        "event_type": "app_open",
        "first_apertura": True,
        "user_email": "test@example.com",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 400
    assert "pii" in response.json().get("detail", "").lower()

def test_track_pii_ip_address_rejected(base_url):
    response = client.post(base_url, json={
        "event_type": "tooltip_shown",
        "tooltip_id": "settings_help",
        "ip_address": "192.168.1.1",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 400
    assert "pii" in response.json().get("detail", "").lower()

def test_track_pii_user_id_rejected(base_url):
    response = client.post(base_url, json={
        "event_type": "tooltip_dismissed",
        "tooltip_id": "settings_help",
        "user_id": "usr_12345",
        "timestamp": "2023-10-01T12:00:00Z"
    })
    assert response.status_code == 400
    assert "pii" in response.json().get("detail", "").lower()
