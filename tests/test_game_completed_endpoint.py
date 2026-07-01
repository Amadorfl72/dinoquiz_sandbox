import pytest
from fastapi.testclient import TestClient

# Assuming the FastAPI application instance is named `app` in `main.py`
from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "score": 1500,
    "duration_ms": 120000,
    "app_version": "1.0.4"
}

def test_ingest_game_completed_valid_payload():
    response = client.post("/events/game_completed", json=VALID_PAYLOAD)
    assert response.status_code == 202

def test_ingest_game_completed_missing_score():
    payload = VALID_PAYLOAD.copy()
    del payload["score"]
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_missing_duration_ms():
    payload = VALID_PAYLOAD.copy()
    del payload["duration_ms"]
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_missing_app_version():
    payload = VALID_PAYLOAD.copy()
    del payload["app_version"]
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_invalid_score_type():
    payload = VALID_PAYLOAD.copy()
    payload["score"] = "1500"
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_invalid_duration_ms_type():
    payload = VALID_PAYLOAD.copy()
    payload["duration_ms"] = "120000"
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_invalid_app_version_type():
    payload = VALID_PAYLOAD.copy()
    payload["app_version"] = 104
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_negative_score():
    payload = VALID_PAYLOAD.copy()
    payload["score"] = -10
    response = client.post("/events/game_completed", json=payload)
    # Assuming negative scores are invalid, or adjust to 202 if they are allowed
    assert response.status_code == 422

def test_ingest_game_completed_negative_duration():
    payload = VALID_PAYLOAD.copy()
    payload["duration_ms"] = -5000
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 422

def test_ingest_game_completed_empty_payload():
    response = client.post("/events/game_completed", json={})
    assert response.status_code == 422

def test_ingest_game_completed_extra_fields_ignored():
    payload = VALID_PAYLOAD.copy()
    payload["user_id"] = "abc-123"
    response = client.post("/events/game_completed", json=payload)
    assert response.status_code == 202
