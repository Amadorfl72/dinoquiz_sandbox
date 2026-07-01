import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_track_app_open_with_flag():
    response = client.post("/analytics/track", json={
        "event_type": "app_open",
        "first_apertura": True
    })
    assert response.status_code in [200, 201, 202]
    assert response.json().get("status") == "success"

def test_track_app_open_without_flag():
    response = client.post("/analytics/track", json={
        "event_type": "app_open",
        "first_apertura": False
    })
    assert response.status_code in [200, 201, 202]
    assert response.json().get("status") == "success"

def test_track_tooltip_shown():
    response = client.post("/analytics/track", json={
        "event_type": "tooltip_shown",
        "tooltip_id": "help_button_tooltip"
    })
    assert response.status_code in [200, 201, 202]
    assert response.json().get("status") == "success"

def test_track_tooltip_dismissed():
    response = client.post("/analytics/track", json={
        "event_type": "tooltip_dismissed",
        "tooltip_id": "help_button_tooltip"
    })
    assert response.status_code in [200, 201, 202]
    assert response.json().get("status") == "success"

def test_track_invalid_event_type():
    response = client.post("/analytics/track", json={
        "event_type": "invalid_event"
    })
    assert response.status_code == 400

def test_track_missing_event_type():
    response = client.post("/analytics/track", json={
        "tooltip_id": "some_tooltip"
    })
    assert response.status_code == 422

def test_track_rejects_pii_email():
    response = client.post("/analytics/track", json={
        "event_type": "app_open",
        "first_apertura": True,
        "email": "user@example.com"
    })
    assert response.status_code == 400
    assert "pii" in response.json().get("detail", "").lower()

def test_track_rejects_pii_user_id():
    response = client.post("/analytics/track", json={
        "event_type": "tooltip_shown",
        "tooltip_id": "help_button_tooltip",
        "user_id": "12345"
    })
    assert response.status_code == 400
    assert "pii" in response.json().get("detail", "").lower()
