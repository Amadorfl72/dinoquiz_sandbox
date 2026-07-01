import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_METRICS = ["game_started", "app_open", "session_duration"]

@pytest.mark.parametrize("metric_name", VALID_METRICS)
def test_ingest_valid_metrics(metric_name):
    payload = {"metric_name": metric_name, "count": 1}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "success"

def test_ingest_invalid_metric_name():
    payload = {"metric_name": "invalid_metric", "count": 1}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 400
    assert "Invalid metric name" in response.json()["detail"]

def test_ingest_missing_metric_name():
    payload = {"count": 1}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 422

def test_ingest_missing_count():
    payload = {"metric_name": "game_started"}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 422

@pytest.mark.parametrize("pii_field, pii_value", [
    ("email", "user@example.com"),
    ("user_id", "12345"),
    ("ip_address", "192.168.1.1"),
    ("phone_number", "555-1234"),
    ("first_name", "John")
])
def test_ingest_rejects_pii(pii_field, pii_value):
    payload = {"metric_name": "game_started", "count": 1, pii_field: pii_value}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 400
    assert "PII" in response.json()["detail"]

def test_ingest_negative_count():
    payload = {"metric_name": "game_started", "count": -1}
    response = client.post("/api/v1/metrics", json=payload)
    assert response.status_code == 400
