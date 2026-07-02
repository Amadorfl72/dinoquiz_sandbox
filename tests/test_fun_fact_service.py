import pytest
from unittest.mock import patch

# Assuming the implementation is in src/analytics/logger.js
from src.analytics.logger import logFunFactViewed
from src.analytics.metrics import incrementMetric


@pytest.fixture
def mock_logger():
    with patch('src.analytics.logger.logFunFactViewed') as mock:
        yield mock


@pytest.fixture
def mock_metrics_client():
    with patch('src.analytics.metrics.incrementMetric') as mock:
        yield mock


def test_fun_fact_viewed_logging(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"

    logFunFactViewed(question_id, dino_id, app_version)

    mock_logger.assert_called_once_with(question_id, dino_id, app_version)


def test_fun_fact_viewed_metric_increment(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"

    logFunFactViewed(question_id, dino_id, app_version)

    mock_metrics_client.assert_called_once_with("fun_fact_viewed")


def test_fun_fact_viewed_metric_and_logging_integration(mock_logger, mock_metrics_client):
    question_id = "q789"
    dino_id = "d999"
    app_version = "2.1.3"

    logFunFactViewed(question_id, dino_id, app_version)

    mock_logger.assert_called_once_with(question_id, dino_id, app_version)
    mock_metrics_client.assert_called_once_with("fun_fact_viewed")