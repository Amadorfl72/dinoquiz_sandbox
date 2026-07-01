import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in a module called `metrics_service`
# and exposes a function `track_fun_fact_viewed`
from metrics_service import track_fun_fact_viewed

@pytest.fixture
def mock_logger():
    with patch('metrics_service.logger') as mock:
        yield mock

@pytest.fixture
def mock_metrics_client():
    with patch('metrics_service.metrics_client') as mock:
        yield mock

def test_fun_fact_viewed_log_payload(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"
    
    track_fun_fact_viewed(question_id, dino_id, app_version)
    
    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': app_version
    }
    
    mock_logger.info.assert_called_once_with(expected_payload)

def test_fun_fact_viewed_metric_increment(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"
    
    track_fun_fact_viewed(question_id, dino_id, app_version)
    
    mock_metrics_client.increment.assert_called_once_with('fun_fact_viewed')

def test_fun_fact_viewed_metric_increment_multiple_calls(mock_logger, mock_metrics_client):
    track_fun_fact_viewed("q1", "d1", "v1")
    track_fun_fact_viewed("q2", "d2", "v2")
    
    assert mock_metrics_client.increment.call_count == 2
    mock_metrics_client.increment.assert_any_call('fun_fact_viewed')

def test_fun_fact_viewed_log_payload_structure(mock_logger, mock_metrics_client):
    track_fun_fact_viewed("q999", "d888", "2.1.3")
    
    call_args = mock_logger.info.call_args[0][0]
    assert isinstance(call_args, dict)
    assert call_args.get('event') == 'fun_fact_viewed'
    assert 'question_id' in call_args
    assert 'dino_id' in call_args
    assert 'app_version' in call_args
