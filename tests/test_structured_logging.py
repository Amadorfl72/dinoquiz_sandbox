import json
import pytest
from unittest.mock import patch
from datetime import datetime

import logging_utils


def test_log_app_open_structure():
    with patch('logging_utils.logger') as mock_logger:
        logging_utils.log_app_open(app_version="1.0.0", locale="en-US")
        mock_logger.info.assert_called_once()
        log_call = mock_logger.info.call_args[0][0]
        log_data = json.loads(log_call)
        
        assert log_data["event"] == "app_open"
        assert "timestamp" in log_data
        assert log_data["app_version"] == "1.0.0"
        assert log_data["locale"] == "en-US"


def test_log_game_started_structure():
    with patch('logging_utils.logger') as mock_logger:
        logging_utils.log_game_started(app_version="1.0.0", locale="en-US")
        mock_logger.info.assert_called_once()
        log_call = mock_logger.info.call_args[0][0]
        log_data = json.loads(log_call)
        
        assert log_data["event"] == "game_started"
        assert "timestamp" in log_data
        assert log_data["app_version"] == "1.0.0"
        assert log_data["locale"] == "en-US"


def test_timestamp_is_valid_iso_format():
    with patch('logging_utils.logger') as mock_logger:
        logging_utils.log_app_open(app_version="1.0.0", locale="en-US")
        log_call = mock_logger.info.call_args[0][0]
        log_data = json.loads(log_call)
        
        # Check if timestamp is valid ISO format
        datetime.fromisoformat(log_data["timestamp"])


def test_log_app_open_is_valid_json():
    with patch('logging_utils.logger') as mock_logger:
        logging_utils.log_app_open(app_version="2.1.3", locale="fr-FR")
        log_call = mock_logger.info.call_args[0][0]
        # Should not raise json.JSONDecodeError
        json.loads(log_call)


def test_log_game_started_is_valid_json():
    with patch('logging_utils.logger') as mock_logger:
        logging_utils.log_game_started(app_version="2.1.3", locale="fr-FR")
        log_call = mock_logger.info.call_args[0][0]
        # Should not raise json.JSONDecodeError
        json.loads(log_call)
