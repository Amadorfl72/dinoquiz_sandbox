import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ingest_game_started():
    response = client.post("/metrics", json={"metric": "game_started", "count": 1})
    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}

def test_ingest_app_open():
    response = client.post("/metrics", json={"metric": "app_open", "count": 5})
    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}

def test_ingest_missing_metric():
    response = client.post("/metrics", json={"count": 1})
    assert response.status_code == 422

def test_ingest_missing_count():
    response = client.post("/metrics", json={"metric": "game_started"})
    assert response.status_code == 422

def test_ingest_invalid_metric_name():
    response = client.post("/metrics", json={"metric": "invalid_metric", "count": 1})
    assert response.status_code == 400
    assert "Invalid metric" in response.json()["detail"]

def test_ingest_pii_field_rejected():
    response = client.post("/metrics", json={"metric": "game_started", "count": 1, "user_id": "123"})
    assert response.status_code == 400
    assert "PII" in response.json()["detail"]

def test_ingest_invalid_json():
    response = client.post("/metrics", data="{invalid json", headers={"Content-Type": "application/json"})
    assert response.status_code == 400
