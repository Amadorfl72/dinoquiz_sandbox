import pytest
import requests

BASE_URL = "http://localhost:8080/api/v1/events"
ENDPOINT = "/game_completed"

@pytest.fixture
def api_url():
    return f"{BASE_URL}{ENDPOINT}"

@pytest.fixture
def valid_payload():
    return {
        "score": 7,
        "duration_ms": 300000,
        "app_version": "1.2.3"
    }

def test_ingest_game_completed_success(api_url, valid_payload):
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201

def test_ingest_missing_score(api_url, valid_payload):
    del valid_payload["score"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_missing_duration_ms(api_url, valid_payload):
    del valid_payload["duration_ms"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_missing_app_version(api_url, valid_payload):
    del valid_payload["app_version"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_empty_payload(api_url):
    response = requests.post(api_url, json={})
    assert response.status_code == 400

def test_ingest_invalid_score_type(api_url, valid_payload):
    valid_payload["score"] = "high"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_invalid_duration_type(api_url, valid_payload):
    valid_payload["duration_ms"] = "five_minutes"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_negative_duration(api_url, valid_payload):
    valid_payload["duration_ms"] = -100
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_negative_score(api_url, valid_payload):
    valid_payload["score"] = -50
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_invalid_app_version_type(api_url, valid_payload):
    valid_payload["app_version"] = 123
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400

def test_ingest_extra_fields_ignored(api_url, valid_payload):
    valid_payload["player_id"] = "abc123"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201

def test_ingest_zero_values(api_url, valid_payload):
    valid_payload["score"] = 0
    valid_payload["duration_ms"] = 0
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400