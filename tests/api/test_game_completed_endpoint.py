import pytest
import requests

BASE_URL = "http://localhost:3000/api"
ENDPOINT = "/events/game_completed"


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
    assert response.json().get("message") == "Event received"


def test_ingest_missing_score(api_url, valid_payload):
    del valid_payload["score"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400
    assert response.json().get("message") == "Invalid event data"


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


def test_ingest_score_above_max(api_url, valid_payload):
    valid_payload["score"] = 11
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_score_at_max_boundary(api_url, valid_payload):
    valid_payload["score"] = 10
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201


def test_ingest_score_at_min_boundary(api_url, valid_payload):
    valid_payload["score"] = 0
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201


def test_ingest_invalid_app_version_type(api_url, valid_payload):
    valid_payload["app_version"] = 123
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_empty_app_version_string(api_url, valid_payload):
    valid_payload["app_version"] = "   "
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_extra_fields_ignored(api_url, valid_payload):
    valid_payload["player_id"] = "abc123"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201


def test_ingest_zero_duration(api_url, valid_payload):
    valid_payload["duration_ms"] = 0
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_get_method_not_allowed(api_url):
    response = requests.get(api_url)
    assert response.status_code == 405
    assert response.json().get("message") == "Method not allowed"


def test_ingest_put_method_not_allowed(api_url, valid_payload):
    response = requests.put(api_url, json=valid_payload)
    assert response.status_code == 405


def test_ingest_delete_method_not_allowed(api_url):
    response = requests.delete(api_url)
    assert response.status_code == 405


def test_ingest_multiple_validation_errors(api_url):
    payload = {
        "score": "bad",
        "duration_ms": -5,
        "app_version": ""
    }
    response = requests.post(api_url, json=payload)
    assert response.status_code == 400
    errors = response.json().get("errors", [])
    assert len(errors) == 3
