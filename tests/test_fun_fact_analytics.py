import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in fun_facts.analytics
from fun_facts.analytics import track_fun_fact_viewed


@pytest.fixture
def mock_logger():
    with patch('fun_facts.analytics.logger') as mock:
        yield mock

@pytest.fixture
def mock_metrics_client():
    with patch('fun_facts.analytics.metrics_client') as mock:
        yield mock


def test_fun_fact_viewed_logging_payload(mock_logger, mock_metrics_client):
    question_id = "q_123"
    dino_id = "d_456"
    app_version = "1.2.3"

    track_fun_fact_viewed(question_id, dino_id, app_version)

    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': app_version
    }
    
    mock_logger.info.assert_called_once_with(expected_payload)


def test_fun_fact_viewed_metric_increment(mock_logger, mock_metrics_client):
    question_id = "q_123"
    dino_id = "d_456"
    app_version = "1.2.3"

    track_fun_fact_viewed(question_id, dino_id, app_version)

    mock_metrics_client.increment.assert_called_once_with('fun_fact_viewed')


def test_fun_fact_viewed_with_missing_app_version(mock_logger, mock_metrics_client):
    question_id = "q_789"
    dino_id = "d_012"
    app_version = None

    track_fun_fact_viewed(question_id, dino_id, app_version)

    expected_payload = {
        'event': 'fun_fact_viewed',
        'question_id': question_id,
        'dino_id': dino_id,
        'app_version': None
    }
    
    mock_logger.info.assert_called_once_with(expected_payload)
    mock_metrics_client.increment.assert_called_once_with('fun_fact_viewed')
