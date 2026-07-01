import json
import logging
from datetime import datetime

import pytest

import structured_logging


def get_log_json(caplog):
    """Helper to extract and parse the JSON log message."""
    assert len(caplog.records) == 1, "Expected exactly one log record."
    record = caplog.records[0]
    return json.loads(record.message)


def test_log_app_open_outputs_valid_json(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_app_open(app_version="1.0.0", locale="en-US")
    data = get_log_json(caplog)
    assert isinstance(data, dict)


def test_log_app_open_has_correct_event(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_app_open(app_version="1.0.0", locale="en-US")
    data = get_log_json(caplog)
    assert data["event"] == "app_open"


def test_log_app_open_has_required_fields(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_app_open(app_version="1.0.0", locale="en-US")
    data = get_log_json(caplog)
    assert "timestamp" in data
    assert data["app_version"] == "1.0.0"
    assert data["locale"] == "en-US"


def test_log_app_open_timestamp_is_iso_format(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_app_open(app_version="1.0.0", locale="en-US")
    data = get_log_json(caplog)
    # Should not raise ValueError if valid ISO format
    datetime.fromisoformat(data["timestamp"])


def test_log_game_started_outputs_valid_json(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_game_started(app_version="1.2.3", locale="fr-FR")
    data = get_log_json(caplog)
    assert isinstance(data, dict)


def test_log_game_started_has_correct_event(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_game_started(app_version="1.2.3", locale="fr-FR")
    data = get_log_json(caplog)
    assert data["event"] == "game_started"


def test_log_game_started_has_required_fields(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_game_started(app_version="1.2.3", locale="fr-FR")
    data = get_log_json(caplog)
    assert "timestamp" in data
    assert data["app_version"] == "1.2.3"
    assert data["locale"] == "fr-FR"


def test_log_game_started_timestamp_is_iso_format(caplog):
    caplog.set_level(logging.INFO)
    structured_logging.log_game_started(app_version="1.2.3", locale="fr-FR")
    data = get_log_json(caplog)
    datetime.fromisoformat(data["timestamp"])
