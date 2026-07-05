import json
import pytest
import logging
from datetime import datetime
from structured_logging import log_event

def test_app_open_event_structure(caplog):
    with caplog.at_level(logging.INFO):
        log_event('app_open', app_version='1.0.0', locale='en-US')

    assert len(caplog.records) == 1
    log_message = caplog.records[0].message
    log_data = json.loads(log_message)

    assert log_data['event'] == 'app_open'
    assert 'timestamp' in log_data
    assert log_data['app_version'] == '1.0.0'
    assert log_data['locale'] == 'en-US'

def test_game_started_event_structure(caplog):
    with caplog.at_level(logging.INFO):
        log_event('game_started', app_version='1.2.3', locale='fr-FR')

    assert len(caplog.records) == 1
    log_message = caplog.records[0].message
    log_data = json.loads(log_message)

    assert log_data['event'] == 'game_started'
    assert 'timestamp' in log_data
    assert log_data['app_version'] == '1.2.3'
    assert log_data['locale'] == 'fr-FR'

def test_timestamp_is_valid_iso_format(caplog):
    with caplog.at_level(logging.INFO):
        log_event('app_open', app_version='1.0.0', locale='en-US')

    log_message = caplog.records[0].message
    log_data = json.loads(log_message)

    try:
        datetime.fromisoformat(log_data['timestamp'])
    except ValueError:
        pytest.fail("Timestamp is not a valid ISO format string")

def test_output_is_valid_json(caplog):
    with caplog.at_level(logging.INFO):
        log_event('app_open', app_version='1.0.0', locale='en-US')

    log_message = caplog.records[0].message
    try:
        json.loads(log_message)
    except json.JSONDecodeError:
        pytest.fail("Log output is not valid JSON")

def test_log_event_returns_log_entry(caplog):
    with caplog.at_level(logging.INFO):
        result = log_event('app_open', app_version='1.0.0', locale='en-US')

    assert isinstance(result, dict)
    assert result['event'] == 'app_open'
    assert result['app_version'] == '1.0.0'
    assert result['locale'] == 'en-US'
    assert 'timestamp' in result

def test_log_event_logs_exactly_once(caplog):
    with caplog.at_level(logging.INFO):
        log_event('game_started', app_version='1.2.3', locale='fr-FR')

    assert len(caplog.records) == 1

def test_log_event_preserves_extra_data(caplog):
    with caplog.at_level(logging.INFO):
        log_event('app_open', app_version='1.0.0', locale='en-US', extra_field='value')

    log_message = caplog.records[0].message
    log_data = json.loads(log_message)

    assert log_data['extra_field'] == 'value'

def test_log_entry_contains_expected_keys(caplog):
    with caplog.at_level(logging.INFO):
        log_event('app_open', app_version='1.0.0', locale='en-US')

    log_message = caplog.records[0].message
    log_data = json.loads(log_message)

    expected_keys = {'event', 'timestamp', 'app_version', 'locale'}
    assert expected_keys.issubset(set(log_data.keys()))

def test_logged_json_matches_returned_object(caplog):
    with caplog.at_level(logging.INFO):
        result = log_event('app_open', app_version='1.0.0', locale='en-US')

    log_message = caplog.records[0].message
    parsed = json.loads(log_message)
    assert parsed == result
