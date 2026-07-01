import json
import datetime
import pytest
from unittest.mock import patch

from app.event_logger import log_app_open, log_game_started

@pytest.fixture
def mock_logger():
    with patch('app.event_logger.logger') as mock:
        yield mock

def test_log_app_open_is_valid_json(mock_logger):
    log_app_open(app_version="1.0.0", locale="en-US")
    mock_logger.info.assert_called_once()
    log_message = mock_logger.info.call_args[0][0]
    json.loads(log_message)

def test_log_app_open_contains_required_fields(mock_logger):
    log_app_open(app_version="1.0.0", locale="en-US")
    log_message = mock_logger.info.call_args[0][0]
    log_data = json.loads(log_message);
    
    assert log_data.get("event") == "app_open"
    assert "timestamp" in log_data
    assert log_data.get("app_version") == "1.0.0"
    assert log_data.get("locale") == "en-US"

def test_log_game_started_is_valid_json(mock_logger):
    log_game_started(app_version="1.0.0", locale="en-US")
    mock_logger.info.assert_called_once()
    log_message = mock_logger.info.call_args[0][0]
    json.loads(log_message)

def test_log_game_started_contains_required_fields(mock_logger):
    log_game_started(app_version="2.0.0", locale="fr-FR")
    log_message = mock_logger.info.call_args[0][0]
    log_data = json.loads(log_message);
    
    assert log_data.get("event") == "game_started"
    assert "timestamp" in log_data
    assert log_data.get("app_version") == "2.0.0"
    assert log_data.get("locale") == "fr-FR"

def test_timestamp_is_iso_format(mock_logger):
    log_app_open(app_version="1.0.0", locale="en-US")
    log_message = mock_logger.info.call_args[0][0]
    log_data = json.loads(log_message);
    
    try:
        datetime.datetime.fromisoformat(log_data["timestamp"])
    except (ValueError, KeyError):
        pytest.fail("Timestamp is missing or not in valid ISO format")