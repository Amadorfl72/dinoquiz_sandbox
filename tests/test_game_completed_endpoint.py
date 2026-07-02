import pytest
import requests

BASE_URL = "http://localhost:8000/api/events"

def test_game_completed_valid_payload():
    payload = {
        "event_type": "game_completed",
        "app_version": "1.0.0",
        "duration_ms": 1500
    }
    response = requests.post(BASE_URL, json=payload)
    assert response.status_code == 201

def test_game_completed_missing_app_version():
    payload = {
        "event_type": "game_completed",
        "duration_ms": 1500
    }
    response = requests.post(BASE_URL, json=payload)
    assert response.status_code == 400
    assert "app_version" in response.json().get("detail", "").lower()

def test_game_completed_negative_duration_ms():
    payload = {
        "event_type": "game_completed",
        "app_version": "1.0.0",
        "duration_ms": -100
    }
    response = requests.post(BASE_URL, json=payload)
    assert response.status_code == 400
    assert "duration_ms" in response.json().get("detail", "").lower()
