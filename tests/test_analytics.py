import json
import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in a module named 'analytics'
from analytics import track_fun_fact_viewed

class TestFunFactViewed:
    @patch('analytics.metrics_client')
    @patch('analytics.logger')
    def test_track_fun_fact_viewed_logs_correct_payload(self, mock_logger, mock_metrics):
        question_id = "q123"
        dino_id = "d456"
        app_version = "1.0.0"

        track_fun_fact_viewed(question_id, dino_id, app_version)

        # Verify log payload
        mock_logger.info.assert_called_once()
        logged_payload = mock_logger.info.call_args[0][0]
        
        # Handle both dict and JSON string logging
        if isinstance(logged_payload, str):
            logged_payload = json.loads(logged_payload)
            
        assert logged_payload['event'] == 'fun_fact_viewed'
        assert logged_payload['question_id'] == question_id
        assert logged_payload['dino_id'] == dino_id
        assert logged_payload['app_version'] == app_version

    @patch('analytics.metrics_client')
    @patch('analytics.logger')
    def test_track_fun_fact_viewed_increments_metric(self, mock_logger, mock_metrics):
        question_id = "q123"
        dino_id = "d456"
        app_version = "1.0.0"

        track_fun_fact_viewed(question_id, dino_id, app_version)

        # Verify metric increment
        mock_metrics.increment.assert_called_once_with('fun_fact_viewed')

    @patch('analytics.metrics_client')
    @patch('analytics.logger')
    def test_track_fun_fact_viewed_handles_empty_strings(self, mock_logger, mock_metrics):
        question_id = ""
        dino_id = ""
        app_version = ""

        track_fun_fact_viewed(question_id, dino_id, app_version)

        mock_logger.info.assert_called_once()
        logged_payload = mock_logger.info.call_args[0][0]
        if isinstance(logged_payload, str):
            logged_payload = json.loads(logged_payload)

        assert logged_payload['question_id'] == ""
        assert logged_payload['dino_id'] == ""
        assert logged_payload['app_version'] == ""
        mock_metrics.increment.assert_called_once_with('fun_fact_viewed')
