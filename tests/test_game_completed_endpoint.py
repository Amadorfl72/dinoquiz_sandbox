import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ingest_valid_game_completed_event():
    payload = {
        "score": 1500,
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_ingest_event_missing_score():
    payload = {
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_missing_duration_ms():
    payload = {
        "score": 1500,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_missing_app_version():
    payload = {
        "score": 1500,
        "duration_ms": 120000
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_invalid_score_type():
    payload = {
        "score": "1500",
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_invalid_duration_ms_type():
    payload = {
        "score": 1500,
        "duration_ms": "120000",
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_invalid_app_version_type():
    payload = {
        "score": 1500,
        "duration_ms": 120000,
        "app_version": 1.0
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_empty_payload():
    response = client.post("/events/game_completed", json={})
    assert response.status_code == 422

def test_ingest_event_with_extra_fields():
    payload = {
        "score": 1500,
        "duration_ms": 120000,
        "app_version": "1.0.0",
        "player_id": "anonymous_123"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 201
    assert response.json().get("status") == "success"

def test_ingest_event_negative_score():
    payload = {
        "score": -100,
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_event_negative_duration():
    payload = {
        "score": 100,
        "duration_ms": -5000,
        "app_version": "1.0.0"
    }
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422
