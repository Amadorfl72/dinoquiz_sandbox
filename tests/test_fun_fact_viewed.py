import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in a module named `analytics`
from app.analytics import track_fun_fact_viewed

@pytest.fixture
def mock_logger():
    with patch('app.analytics.logger') as mock:
        yield mock

@pytest.fixture
def mock_metrics_client():
    with patch('app.analytics.metrics_client') as mock:
        yield mock

def test_fun_fact_viewed_logging_and_metric(mock_logger, mock_metrics_client):
    """
    Test that track_fun_fact_viewed logs the correct structured payload
    and increments the 'fun_fact_viewed' metric.
    """
    question_id = "q_123"
    dino_id = "d_456"
    app_version = "1.2.3"

    track_fun_fact_viewed(question_id, dino_id, app_version)

    # Verify the structured log payload
    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': app_version
    }
    mock_logger.info.assert_called_once_with(expected_payload)

    # Verify the aggregated metric is incremented
    mock_metrics_client.increment.assert_called_once_with('fun_fact_viewed')

def test_fun_fact_viewed_with_different_ids(mock_logger, mock_metrics_client):
    """
    Test the function with different inputs to ensure dynamic payload generation.
    """
    question_id = "q_999"
    dino_id = "d_001"
    app_version = "2.0.0"

    track_fun_fact_viewed(question_id, dino_id, app_version)

    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': app_version
    }
    
    mock_logger.info.assert_called_once_with(expected_payload)
    mock_metrics_client.increment.assert_called_once_with('fun_fact_viewed')
