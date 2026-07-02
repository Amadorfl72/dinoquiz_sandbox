import pytest
from unittest.mock import patch

# Assuming the implementation is in app.services.fun_fact_service
from app.services.fun_fact_service import view_fun_fact


@pytest.fixture
def mock_logger():
    with patch('app.services.fun_fact_service.logger') as mock:
        yield mock


@pytest.fixture
def mock_metrics_client():
    with patch('app.services.fun_fact_service.metrics_client') as mock:
        yield mock


def test_fun_fact_viewed_logging(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"

    view_fun_fact(question_id, dino_id, app_version)

    expected_payload = {
        "event": "fun_fact_viewed",
        "question_id": question_id,
        "dino_id": dino_id,
        "app_version": app_version
    }
    mock_logger.info.assert_called_once_with(expected_payload)


def test_fun_fact_viewed_metric_increment(mock_logger, mock_metrics_client):
    question_id = "q123"
    dino_id = "d456"
    app_version = "1.0.0"

    view_fun_fact(question_id, dino_id, app_version)

    mock_metrics_client.increment.assert_called_once_with("fun_fact_viewed")


def test_fun_fact_viewed_metric_and_logging_integration(mock_logger, mock_metrics_client):
    question_id = "q789"
    dino_id = "d999"
    app_version = "2.1.3"

    view_fun_fact(question_id, dino_id, app_version)

    expected_payload = {
        "event": "fun_fact_viewed",
        "question_id": question_id,
        "dino_id": dino_id,
        "app_version": app_version
    }
    
    mock_logger.info.assert_called_once_with(expected_payload)
    mock_metrics_client.increment.assert_called_once_with("fun_fact_viewed")
