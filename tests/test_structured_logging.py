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
