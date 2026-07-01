import pytest
from unittest.mock import patch

# Assuming the implementation is in a module named `analytics`
from analytics import track_fun_fact_viewed

@pytest.fixture
def mock_logger():
    with patch('analytics.logger') as mock:
        yield mock

@pytest.fixture
def mock_increment_metric():
    with patch('analytics.increment_metric') as mock:
        yield mock

def test_fun_fact_viewed_log_payload(mock_logger, mock_increment_metric):
    question_id = "q_001"
    dino_id = "d_002"
    app_version = "1.2.3"
    
    track_fun_fact_viewed(question_id, dino_id, app_version)
    
    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': app_version
    }
    mock_logger.info.assert_called_once_with(expected_payload)

def test_fun_fact_viewed_metric_increment(mock_logger, mock_increment_metric):
    question_id = "q_001"
    dino_id = "d_002"
    app_version = "1.2.3"
    
    track_fun_fact_viewed(question_id, dino_id, app_version)
    
    mock_increment_metric.assert_called_once_with('fun_fact_viewed')

def test_fun_fact_viewed_handles_none_app_version(mock_logger, mock_increment_metric):
    question_id = "q_001"
    dino_id = "d_002"
    app_version = None
    
    track_fun_fact_viewed(question_id, dino_id, app_version)
    
    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': None
    }
    mock_logger.info.assert_called_once_with(expected_payload)
    mock_increment_metric.assert_called_once_with('fun_fact_viewed')