"""
Automated tests for TRIOFSND-25: fun_fact_viewed metric and logging.
"""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.metrics import MetricsAggregator
from app.logging_utils import StructuredLogger
from app.events import log_fun_fact_viewed


@pytest.fixture
def mock_logger():
    return MagicMock(spec=StructuredLogger)


@pytest.fixture
def mock_metrics():
    return MagicMock(spec=MetricsAggregator)


@pytest.fixture
def sample_payload():
    return {
        "question_id": "q_42",
        "dino_id": "dino_7",
        "app_version": "1.4.2",
    }


@pytest.fixture
def expected_event():
    return {
        "event": "fun_fact_viewed",
        "question_id": "q_42",
        "dino_id": "dino_7",
        "app_version": "1.4.2",
    }


class TestFunFactViewedLogging:
    """Tests for structured log payload creation."""

    def test_log_payload_contains_event_name(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["event"] == "fun_fact_viewed"

    def test_log_payload_contains_question_id(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["question_id"] == "q_42"

    def test_log_payload_contains_dino_id(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["dino_id"] == "dino_7"

    def test_log_payload_contains_app_version(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["app_version"] == "1.4.2"

    def test_log_payload_has_exactly_four_fields(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        assert set(logged_payload.keys()) == {
            "event",
            "question_id",
            "dino_id",
            "app_version",
        }

    def test_log_payload_is_json_serializable(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        logged_payload = mock_logger.log.call_args[0][0]
        serialized = json.dumps(logged_payload)
        deserialized = json.loads(serialized)
        assert deserialized == logged_payload

    def test_logger_log_called_once(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        assert mock_logger.log.call_count == 1


class TestFunFactViewedMetric:
    """Tests for aggregated metric increment."""

    def test_metric_incremented_once(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        mock_metrics.increment.assert_called_once_with("fun_fact_viewed")

    def test_metric_name_is_fun_fact-viewed(self, mock_logger, mock_metrics, sample_payload):
        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        assert mock_metrics.increment.call_args[0][0] == "fun_fact_viewed"

    def test_metric_incremented_before_logging(self, mock_logger, mock_metrics, sample_payload):
        manager = MagicMock()
        manager.attach_mock(mock_metrics.increment, "increment")
        manager.attach_mock(mock_logger.log, "log")

        log_fun_fact_viewed(mock_logger, mock_metrics, **sample_payload)

        assert manager.mock_calls[0][0] == "increment"
        assert manager.mock_calls[1][0] == "log"


class TestFunFactViewedEdgeCases:
    """Tests for edge cases and error handling."""

    def test_missing_question_id_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="question_id"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id=None, dino_id="dino_7", app_version="1.4.2"
            )

    def test_missing_dino_id_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="dino_id"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id="q_42", dino_id=None, app_version="1.4.2"
            )

    def test_missing_app_version_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="app_version"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id="q_42", dino_id="dino_7", app_version=None
            )

    def test_empty_question_id_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="question_id"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id="", dino_id="dino_7", app_version="1.4.2"
            )

    def test_empty_dino_id_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="dino_id"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id="q_42", dino_id="", app_version="1.4.2"
            )

    def test_empty_app_version_raises_value_error(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError, match="app_version"):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id="q_42", dino_id="dino_7", app_version=""
            )

    def test_metric_not_incremented_on_invalid_payload(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id=None, dino_id="dino_7", app_version="1.4.2"
            )

        assert mock_metrics.increment.call_count == 0

    def test_log_not_emitted_on_invalid_payload(self, mock_logger, mock_metrics):
        with pytest.raises(ValueError):
            log_fun_fact_viewed(
                mock_logger, mock_metrics, question_id=None, dino_id="dino_7", app_version="1.4.2"
            )

        assert mock_logger.log.call_count == 0

    def test_integer_question_id_accepted(self, mock_logger, mock_metrics):
        log_fun_fact_viewed(mock_logger, mock_metrics, question_id=42, dino_id="dino_7", app_version="1.4.2")

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["question_id"] == 42

    def test_integer_dino_id_accepted(self, mock_logger, mock_metrics):
        log_fun_fact_viewed(mock_logger, mock_metrics, question_id="q_42", dino_id=7, app_version="1.4.2")

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["dino_id"] == 7

    def test_semver_app_version_accepted(self, mock_logger, mock_metrics):
        log_fun_fact_viewed(mock_logger, mock_metrics, question_id="q_42", dino_id="dino_7", app_version="2.0.0-beta.1")

        logged_payload = mock_logger.log.call_args[0][0]
        assert logged_payload["app_version"] == "2.0.0-beta.1"


class TestFunFactViewedIntegration:
    """Integration tests with real logger and metrics stubs."""

    def test_full_flow_with_stub_logger(self, sample_payload, expected_event):
        captured_logs = []

        class StubLogger:
            def log(self, payload):
                captured_logs.append(payload)

        class StubMetrics:
            def __init__(self):
                self.counters = {}

            def increment(self, name):
                self.counters[name] = self.counters.get(name, 0) + 1

        stub_logger = StubLogger()
        stub_metrics = StubMetrics()

        log_fun_fact_viewed(stub_logger, stub_metrics, **sample_payload)

        assert len(captured_logs) == 1
        assert captured_logs[0] == expected_event
        assert stub_metrics.counters["fun_fact_viewed"] == 1

    def test_multiple_events_accumulate_metric(self, mock_logger):
        class StubMetrics:
            def __init__(self):
                self.counters = {}

            def increment(self, name):
                self.counters[name] = self.counters.get(name, 0) + 1

        stub_metrics = StubMetrics()

        for i in range(5):
            log_fun_fact_viewed(
                mock_logger, stub_metrics, question_id=f"q_{i}", dino_id=f"dino_{i}", app_version="1.4.2"
            )

        assert stub_metrics.counters["fun_fact_viewed"] == 5
        assert mock_logger.log.call_count == 5
