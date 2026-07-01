import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_app_open_event_success():
    response = client.post("/api/analytics/events", json={
        "event_type": "app_open",
        "first_apertura": True
    })
    assert response.status_code == 201
    assert response.json()["status"] == "success"

def test_app_open_event_missing_flag():
    response = client.post("/api/analytics/events", json={
        "event_type": "app_open"
    })
    assert response.status_code == 400
    assert "first_apertura" in response.json()["detail"]

def test_tooltip_shown_success():
    response = client.post("/api/analytics/events", json={
        "event_type": "tooltip_shown"
    })
    assert response.status_code == 201

def test_tooltip_dismissed_success():
    response = client.post("/api/analytics/events", json={
        "event_type": "tooltip_dismissed"
    })
    assert response.status_code == 201

def test_invalid_event_type():
    response = client.post("/api/analytics/events", json={
        "event_type": "invalid_event"
    })
    assert response.status_code == 400

def test_pii_rejection():
    response = client.post("/api/analytics/events", json={
        "event_type": "tooltip_shown",
        "email": "user@example.com",
        "ip_address": "192.168.1.1"
    })
    assert response.status_code == 400
    assert "PII" in response.json()["detail"] or "pii" in response.json()["detail"]

def test_user_id_rejection():
    response = client.post("/api/analytics/events", json={
        "event_type": "tooltip_shown",
        "user_id": 12345
    })
    assert response.status_code == 400
