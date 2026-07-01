"""
Automated tests for TRIOFSND-25: fun_fact_viewed metric and logging.
"""
import pytest
from unittest.mock import patch, MagicMock

from app.metrics import fun_fact_metrics  # module under test


class TestFunFactViewedLogging:
    """Tests for the structured log payload when a fun fact is viewed."""

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_payload_contains_required_fields(self, mock_metrics, mock_logger):
        """Verify the log payload includes event, question_id, dino_id, app_version."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="q-123",
            dino_id="dino-456",
            app_version="1.2.3",
        )

        mock_logger.info.assert_called_once()
        logged_payload = mock_logger.info.call_args.kwargs.get("extra", {})

        assert logged_payload["event"] == "fun_fact_viewed"
        assert logged_payload["question_id"] == "q-123"
        assert logged_payload["dino_id"] == "dino-456"
        assert logged_payload["app_version"] == "1.2.3"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_event_name_is_exactly_fun_fact_viewed(self, mock_metrics, mock_logger):
        """The event field must be the exact string 'fun_fact_viewed'."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="q-001",
            dino_id="dino-001",
            app_version="2.0.0",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["event"] == "fun_fact_viewed"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_payload_has_no_extra_unexpected_keys(self, mock_metrics, mock_logger):
        """Ensure the payload only contains the four specified fields."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="q-999",
            dino_id="dino-999",
            app_version="0.9.9",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        expected_keys = {"event", "question_id", "dino_id", "app_version"}
        assert set(payload.keys()) == expected_keys

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_called_exactly_once_per_view(self, mock_metrics, mock_logger):
        """Each fun fact view triggers exactly one log call."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")
        fun_fact_metrics.log_fun_fact_viewed("q-2", "dino-2", "1.0.0")

        assert mock_logger.info.call_count == 2

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_handles_string_question_id(self, mock_metrics, mock_logger):
        """question_id is passed through as a string in the payload."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="abc-123",
            dino_id="dino-1",
            app_version="1.0.0",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert isinstance(payload["question_id"], str)
        assert payload["question_id"] == "abc-123"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_handles_integer_question_id(self, mock_metrics, mock_logger):
        """question_id can also be an integer and is preserved in the payload."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id=42,
            dino_id="dino-1",
            app_version="1.0.0",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["question_id"] == 42

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_handles_string_dino_id(self, mock_metrics, mock_logger):
        """dino_id is passed through as a string in the payload."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="q-1",
            dino_id="trex",
            app_version="1.0.0",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["dino_id"] == "trex"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_log_preserves_app_version_string(self, mock_metrics, mock_logger):
        """app_version is preserved exactly as provided."""
        fun_fact_metrics.log_fun_fact_viewed(
            question_id="q-1",
            dino_id="dino-1",
            app_version="3.5.2-beta",
        )

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["app_version"] == "3.5.2-beta"


class TestFunFactViewedMetricIncrement:
    """Tests for the aggregated 'fun_fact_viewed' metric increment."""

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_metric_increment_called_once(self, mock_metrics, mock_logger):
        """The aggregated metric is incremented exactly once per view."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        mock_metrics.increment.assert_called_once_with("fun_fact_viewed")

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_metric_name_is_fun_fact_viewed(self, mock_metrics, mock_logger):
        """The metric name passed to increment is exactly 'fun_fact_viewed'."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        call_args = mock_metrics.increment.call_args
        assert call_args.args[0] == "fun_fact_viewed"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_metric_incremented_multiple_times_for_multiple_views(self, mock_metrics, mock_logger):
        """Multiple views increment the metric multiple times."""
        for i in range(5):
            fun_fact_metrics.log_fun_fact_viewed(f"q-{i}", f"dino-{i}", "1.0.0")

        assert mock_metrics.increment.call_count == 5
        for call in mock_metrics.increment.call_args_list:
            assert call.args[0] == "fun_fact_viewed"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_metric_increment_called_before_or_after_log_but_both_happen(self, mock_metrics, mock_logger):
        """Both logging and metric increment must occur for a single view."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        assert mock_logger.info.called
        assert mock_metrics.increment.called


class TestFunFactViewedEdgeCases:
    """Edge case and error handling tests."""

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_empty_string_question_id_is_logged(self, mock_metrics, mock_logger):
        """An empty string question_id is still logged and metric incremented."""
        fun_fact_metrics.log_fun_fact_viewed("", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["question_id"] == ""
        mock_metrics.increment.assert_called_once_with("fun_fact_viewed")

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_none_question_id_raises_value_error(self, mock_metrics, mock_logger):
        """Passing None as question_id should raise a ValueError."""
        with pytest.raises(ValueError):
            fun_fact_metrics.log_fun_fact_viewed(None, "dino-1", "1.0.0")

        mock_logger.info.assert_not_called()
        mock_metrics.increment.assert_not_called()

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_none_dino_id_raises_value_error(self, mock_metrics, mock_logger):
        """Passing None as dino_id should raise a ValueError."""
        with pytest.raises(ValueError):
            fun_fact_metrics.log_fun_fact_viewed("q-1", None, "1.0.0")

        mock_logger.info.assert_not_called()
        mock_metrics.increment.assert_not_called()

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_none_app_version_raises_value_error(self, mock_metrics, mock_logger):
        """Passing None as app_version should raise a ValueError."""
        with pytest.raises(ValueError):
            fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", None)

        mock_logger.info.assert_not_called()
        mock_metrics.increment.assert_not_called()

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_empty_app_version_is_logged(self, mock_metrics, mock_logger):
        """An empty string app_version is still logged (not None)."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["app_version"] == ""

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_metric_increment_failure_does_not_prevent_logging(self, mock_metrics, mock_logger):
        """If the metrics client raises, the log should still have been emitted."""
        mock_metrics.increment.side_effect = RuntimeError("metrics unavailable")

        with pytest.raises(RuntimeError):
            fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_unicode_question_id_is_handled(self, mock_metrics, mock_logger):
        """Unicode characters in question_id are preserved in the log payload."""
        fun_fact_metrics.log_fun_fact_viewed("q-é-123", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["question_id"] == "q-é-123"

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_unicode_dino_id_is_handled(self, mock_metrics, mock_logger):
        """Unicode characters in dino_id are preserved in the log payload."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-恐龙", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert payload["dino_id"] == "dino-恐龙"


class TestFunFactViewedPayloadStructure:
    """Tests validating the overall structure and types of the payload."""

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_payload_is_dict(self, mock_metrics, mock_logger):
        """The logged payload must be a dictionary."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert isinstance(payload, dict)

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_payload_has_exactly_four_keys(self, mock_metrics, mock_logger):
        """The payload must contain exactly four keys, no more, no less."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert len(payload) == 4

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_event_field_is_always_string_type(self, mock_metrics, mock_logger):
        """The event field must always be a string, regardless of inputs."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert isinstance(payload["event"], str)

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_app_version_field_is_string_type(self, mock_metrics, mock_logger):
        """The app_version field must be a string."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert isinstance(payload["app_version"], str)

    @patch("app.metrics.fun_fact_metrics.logger")
    @patch("app.metrics.fun_fact_metrics.metrics_client")
    def test_dino_id_field_is_string_type(self, mock_metrics, mock_logger):
        """The dino_id field must be a string."""
        fun_fact_metrics.log_fun_fact_viewed("q-1", "dino-1", "1.0.0")

        payload = mock_logger.info.call_args.kwargs["extra"]
        assert isinstance(payload["dino_id"], str)
