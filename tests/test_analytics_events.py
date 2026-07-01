import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_EVENTS = [
    ("app_open", {"first_apertura": True}),
    ("app_open", {"first_apertura": False}),
    ("tooltip_shown", {"tooltip_id": "tip_1"}),
    ("tooltip_dismissed", {"tooltip_id": "tip_1"}),
]

@pytest.mark.parametrize("event_type, data", VALID_EVENTS)
def test_valid_analytics_events(event_type, data):
    response = client.post("/api/v1/analytics/events", json={"event_type": event_type, "data": data})
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_invalid_event_type():
    response = client.post("/api/v1/analytics/events", json={"event_type": "invalid_event", "data": {}})
    assert response.status_code == 400

def test_missing_event_type():
    response = client.post("/api/v1/analytics/events", json={"data": {}})
    assert response.status_code == 422

def test_app_open_missing_first_apertura():
    response = client.post("/api/v1/analytics/events", json={"event_type": "app_open", "data": {}})
    assert response.status_code == 400

PII_FIELDS = [
    {"email": "test@example.com"},
    {"user_id": "12345"},
    {"ip_address": "192.168.1.1"},
    {"name": "John Doe"},
]

@pytest.mark.parametrize("pii_data", PII_FIELDS)
def test_pii_rejection(pii_data):
    payload = {"event_type": "tooltip_shown", "data": pii_data}
    response = client.post("/api/v1/analytics/events", json=payload)
    assert response.status_code == 400
    assert "PII" in response.json().get("detail", "")
