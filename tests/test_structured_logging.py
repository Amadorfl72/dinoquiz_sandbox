import json
import pytest
import logging
from io import StringIO
from app.logger import StructuredLogger

@pytest.fixture
def logger_setup():
    log_stream = StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setFormatter(logging.Formatter('%(message)s'))
    
    logger = StructuredLogger()
    logger.logger.addHandler(handler)
    logger.logger.setLevel(logging.INFO)
    
    return logger, log_stream

def get_last_log(log_stream):
    log_output = log_stream.getvalue().strip().split('\n')[-1]
    return json.loads(log_output)

def test_app_open_event(logger_setup):
    logger, log_stream = logger_setup
    logger.app_open(app_version="1.0.0", locale="en-US")
    
    log_data = get_last_log(log_stream)
    
    assert log_data["event"] == "app_open"
    assert "timestamp" in log_data
    assert log_data["app_version"] == "1.0.0"
    assert log_data["locale"] == "en-US"

def test_game_started_event(logger_setup):
    logger, log_stream = logger_setup
    logger.game_started(app_version="1.0.0", locale="fr-FR")
    
    log_data = get_last_log(log_stream)
    
    assert log_data["event"] == "game_started"
    assert "timestamp" in log_data
    assert log_data["app_version"] == "1.0.0"
    assert log_data["locale"] == "fr-FR"

def test_json_structure_validity(logger_setup):
    logger, log_stream = logger_setup
    logger.app_open(app_version="1.0.0", locale="en-US")
    
    # Should not raise JSONDecodeError
    log_data = get_last_log(log_stream)
    assert isinstance(log_data, dict)
