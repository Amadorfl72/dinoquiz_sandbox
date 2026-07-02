import pytest
from unittest.mock import patch
from app.analytics import track_fun_fact_viewed

@patch('app.analytics.metrics_client')
@patch('app.analytics.logger')
def test_track_fun_fact_viewed_logs_correct_payload(mock_logger, mock_metrics):
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

@patch('app.analytics.metrics_client')
@patch('app.analytics.logger')
def test_track_fun_fact_viewed_increments_metric(mock_logger, mock_metrics):
    track_fun_fact_viewed("q1", "d1", "v1")
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')

@patch('app.analytics.metrics_client')
@patch('app.analytics.logger')
def test_track_fun_fact_viewed_handles_none_values(mock_logger, mock_metrics):
    track_fun_fact_viewed(None, None, None)
    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': None,
        'dino_id': None,
        'app_version': None
    }
    mock_logger.info.assert_called_once_with(expected_payload)
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')
