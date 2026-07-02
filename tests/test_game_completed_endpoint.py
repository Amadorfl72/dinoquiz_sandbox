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
        "score": 5,
        "duration_ms": 120000,
        "app_version": "1.0.0"
    }


def test_ingest_game_completed_success(api_url, valid_payload):
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201
    assert response.json().get("message") == "Event received"


def test_ingest_game_completed_missing_score(api_url, valid_payload):
    del valid_payload["score"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_missing_duration_ms(api_url, valid_payload):
    del valid_payload["duration_ms"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_missing_app_version(api_url, valid_payload):
    del valid_payload["app_version"]
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_invalid_score_type(api_url, valid_payload):
    valid_payload["score"] = "1500"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_invalid_duration_type(api_url, valid_payload):
    valid_payload["duration_ms"] = "120000"
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_empty_payload(api_url):
    response = requests.post(api_url, json={})
    assert response.status_code == 400


def test_ingest_game_completed_score_out_of_range_high(api_url, valid_payload):
    valid_payload["score"] = 1500
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_score_out_of_range_low(api_url, valid_payload):
    valid_payload["score"] = -1
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_duration_zero(api_url, valid_payload):
    valid_payload["duration_ms"] = 0
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_empty_app_version(api_url, valid_payload):
    valid_payload["app_version"] = ""
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_whitespace_app_version(api_url, valid_payload):
    valid_payload["app_version"] = "  "
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 400


def test_ingest_game_completed_boundary_score_zero(api_url, valid_payload):
    valid_payload["score"] = 0
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201


def test_ingest_game_completed_boundary_score_ten(api_url, valid_payload):
    valid_payload["score"] = 10
    response = requests.post(api_url, json=valid_payload)
    assert response.status_code == 201


def test_ingest_game_completed_method_not_allowed(api_url):
    response = requests.get(api_url)
    assert response.status_code == 405
