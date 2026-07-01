import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ingest_game_completed_success():
    payload = {
        "score": 1500,
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "received"

def test_ingest_game_completed_missing_score():
    payload = {
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_missing_duration_ms():
    payload = {
        "score": 1500,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_missing_app_version():
    payload = {
        "score": 1500,
        "duration_ms": 120000
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_invalid_score_type():
    payload = {
        "score": "fifteen hundred",
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_negative_duration():
    payload = {
        "score": 1500,
        "duration_ms": -100,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_empty_body():
    response = client.post("/events/game_completed", json={})
    assert response.status_code == 422

def test_ingest_game_completed_extra_fields():
    payload = {
        "score": 1500,
        "duration_ms": 120000,
        "app_version": "1.0.0",
        "device_id": "abc-123"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 201
