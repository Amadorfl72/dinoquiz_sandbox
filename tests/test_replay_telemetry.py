import pytest
from unittest.mock import MagicMock, patch
import time
from datetime import datetime

# Assuming the implementation is in a module named `telemetry`
from telemetry import GameSession, ReplayMetricsCalculator

class TestReplayTelemetry:
    @pytest.fixture
    def mock_telemetry(self):
        return MagicMock()

    @pytest.fixture
    def game_session(self, mock_telemetry):
        return GameSession(mock_telemetry)

    @pytest.fixture
    def metrics_calculator(self, mock_telemetry):
        return ReplayMetricsCalculator(mock_telemetry)

    def test_replay_clicked_event_emitted_with_payload(self, game_session, mock_telemetry):
        """Test that 'replay_clicked' event is registered with previous_score and timestamp."""
        previous_score = 1500
        
        game_session.click_replay(previous_score)
        
        mock_telemetry.track.assert_called_once()
        event_name, payload = mock_telemetry.track.call_args.args
        
        assert event_name == 'replay_clicked'
        assert payload['previous_score'] == previous_score
        assert 'timestamp' in payload
        # Verify timestamp is a valid recent timestamp (within last 5 seconds)
        assert abs(time.time() - payload['timestamp']) < 5

    def test_game_started_event_with_replay_trigger(self, game_session, mock_telemetry):
        """Test that 'game_started' event is registered with trigger:'replay'."""
        game_session.start_game(trigger='replay')
        
        mock_telemetry.track.assert_called_once_with(
            'game_started',
            {'trigger': 'replay'}
        )

    def test_replay_rate_metric_calculated_and_emitted_under_5_min(self, metrics_calculator, mock_telemetry):
        """Test that replay rate metric is calculated and emitted in less than 5 minutes."""
        start_time = time.time()
        
        metrics_calculator.calculate_and_emit_replay_rate()
        
        end_time = time.time()
        
        mock_telemetry.emit_metric.assert_called_once()
        metric_name, metric_value = mock_telemetry.emit_metric.call_args.args
        
        assert metric_name == 'replay_rate'
        assert isinstance(metric_value, (int, float))
        
        # Assert the calculation and emission took less than 5 minutes (300 seconds)
        assert (end_time - start_time) < 300

    def test_replay_flow_integration(self, game_session, mock_telemetry):
        """Test the full replay flow triggers the correct sequence of events."""
        previous_score = 2000
        
        game_session.click_replay(previous_score)
        game_session.start_game(trigger='replay')
        
        assert mock_telemetry.track.call_count == 2
        
        first_call = mock_telemetry.track.call_args_list[0]
        second_call = mock_telemetry.track.call_args_list[1]
        
        assert first_call.args[0] == 'replay_clicked'
        assert first_call.args[1]['previous_score'] == 2000
        
        assert second_call.args[0] == 'game_started'
        assert second_call.args[1]['trigger'] == 'replay'
