import pytest
from fastapi.testclient import TestClient

# Assuming the FastAPI application is defined in app.py
from app import app

client = TestClient(app)

def test_ingest_valid_metric_game_started():
    """Test successful ingestion of a valid 'game_started' metric."""
    response = client.post("/metrics", json={"event_name": "game_started", "count": 1})
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_ingest_valid_metric_app_open():
    """Test successful ingestion of a valid 'app_open' metric."""
    response = client.post("/metrics", json={"event_name": "app_open", "count": 5})
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_ingest_metric_missing_event_name():
    """Test that missing 'event_name' results in a 422 Unprocessable Entity."""
    response = client.post("/metrics", json={"count": 1})
    assert response.status_code == 422

def test_ingest_metric_missing_count():
    """Test that missing 'count' results in a 422 Unprocessable Entity."""
    response = client.post("/metrics", json={"event_name": "game_started"})
    assert response.status_code == 422

def test_ingest_metric_invalid_event_name():
    """Test that an unsupported event_name is rejected with 400 Bad Request."""
    response = client.post("/metrics", json={"event_name": "invalid_event", "count": 1})
    assert response.status_code == 400
    assert "Unsupported event" in response.json().get("detail", "")

def test_ingest_metric_with_pii_email():
    """Test that payloads containing PII (email) are rejected."""
    response = client.post("/metrics", json={
        "event_name": "game_started",
        "count": 1,
        "email": "user@example.com"
    })
    assert response.status_code == 400
    assert "PII" in response.json().get("detail", "")

def test_ingest_metric_with_pii_user_id():
    """Test that payloads containing PII (user_id) are rejected."""
    response = client.post("/metrics", json={
        "event_name": "app_open",
        "count": 1,
        "user_id": "12345"
    })
    assert response.status_code == 400
    assert "PII" in response.json().get("detail", "")

def test_ingest_empty_payload():
    """Test that an empty payload results in a 422 Unprocessable Entity."""
    response = client.post("/metrics", json={})
    assert response.status_code == 422

def test_ingest_invalid_count_type():
    """Test that a non-integer count results in a 422 Unprocessable Entity."""
    response = client.post("/metrics", json={"event_name": "game_started", "count": "five"})
    assert response.status_code == 422

def test_ingest_negative_count():
    """Test that a negative count is rejected."""
    response = client.post("/metrics", json={"event_name": "game_started", "count": -1})
    assert response.status_code == 400
    assert "non-negative" in response.json().get("detail", "")
