import json
import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in a module named 'analytics'
from src.analytics.logger import logFunFactViewed

class TestFunFactViewed:
    @patch('src.analytics.metrics.incrementMetric')
    @patch('src.analytics.logger.logFunFactViewed')
    def test_log_fun_fact_viewed_logs_correct_payload(self, mock_logger, mock_metrics):
        question_id = "q123"
        dino_id = "d456"
        app_version = "1.0.0"

        logFunFactViewed(question_id, dino_id, app_version)

        # Verify log payload
        mock_logger.assert_called_once_with(question_id, dino_id, app_version)

    @patch('src.analytics.metrics.incrementMetric')
    @patch('src.analytics.logger.logFunFactViewed')
    def test_log_fun_fact_viewed_increments_metric(self, mock_logger, mock_metrics):
        question_id = "q123"
        dino_id = "d456"
        app_version = "1.0.0"

        logFunFactViewed(question_id, dino_id, app_version)

        # Verify metric increment
        mock_metrics.assert_called_once_with('fun_fact_viewed')

    @patch('src.analytics.metrics.incrementMetric')
    @patch('src.analytics.logger.logFunFactViewed')
    def test_log_fun_fact_viewed_handles_empty_strings(self, mock_logger, mock_metrics):
        question_id = ""
        dino_id = ""
        app_version = ""

        logFunFactViewed(question_id, dino_id, app_version)

        mock_logger.assert_called_once_with(question_id, dino_id, app_version)
        mock_metrics.assert_called_once_with('fun_fact_viewed')