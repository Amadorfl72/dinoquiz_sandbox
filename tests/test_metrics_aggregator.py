import pytest
from datetime import datetime, timedelta
from app.metrics_aggregator import MetricsAggregator, LogIngestor


@pytest.fixture
def ingestor():
    return LogIngestor()


@pytest.fixture
def aggregator():
    return MetricsAggregator()


@pytest.fixture
def sample_question_answered_logs():
    return [
        {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u2",
            "success": False,
            "time_to_answer_ms": 12000,
            "timestamp": "2024-01-01T10:01:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q2",
            "user_id": "u3",
            "success": True,
            "time_to_answer_ms": 3000,
            "timestamp": "2024-01-01T10:02:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q2",
            "user_id": "u4",
            "success": True,
            "time_to_answer_ms": 4000,
            "timestamp": "2024-01-01T10:03:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q3",
            "user_id": "u5",
            "success": False,
            "time_to_answer_ms": 15000,
            "timestamp": "2024-01-01T10:04:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q3",
            "user_id": "u6",
            "success": False,
            "time_to_answer_ms": 20000,
            "timestamp": "2024-01-01T10:05:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q4",
            "user_id": "u7",
            "success": True,
            "time_to_answer_ms": 2000,
            "timestamp": "2024-01-01T10:06:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q5",
            "user_id": "u8",
            "success": False,
            "time_to_answer_ms": 25000,
            "timestamp": "2024-01-01T10:07:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q6",
            "user_id": "u9",
            "success": False,
            "time_to_answer_ms": 30000,
            "timestamp": "2024-01-01T10:08:00Z"
        },
        {
            "event_type": "question_answered",
            "question_id": "q7",
            "user_id": "u10",
            "success": False,
            "time_to_answer_ms": 35000,
            "timestamp": "2024-01-01T10:09:00Z"
        }
    ]


@pytest.fixture
def sample_feedback_shown_logs():
    return [
        {
            "event_type": "feedback_shown",
            "question_id": "q1",
            "user_id": "u1",
            "feedback_type": "correct",
            "timestamp": "2024-01-01T10:00:05Z"
        },
        {
            "event_type": "feedback_shown",
            "question_id": "q1",
            "user_id": "u2",
            "feedback_type": "incorrect",
            "timestamp": "2024-01-01T10:01:05Z"
        },
        {
            "event_type": "feedback_shown",
            "question_id": "q2",
            "user_id": "u3",
            "feedback_type": "correct",
            "timestamp": "2024-01-01T10:02:05Z"
        }
    ]


class TestLogIngestion:
    def test_ingest_question_answered_log(self, ingestor):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        result = ingestor.ingest(log)
        assert result is True
        assert ingestor.get_log_count() == 1

    def test_ingest_feedback_shown_log(self, ingestor):
        log = {
            "event_type": "feedback_shown",
            "question_id": "q1",
            "user_id": "u1",
            "feedback_type": "correct",
            "timestamp": "2024-01-01T10:00:05Z"
        }
        result = ingestor.ingest(log)
        assert result is True
        assert ingestor.get_log_count() == 1

    def test_ingest_invalid_event_type(self, ingestor):
        log = {
            "event_type": "invalid_event",
            "question_id": "q1",
            "user_id": "u1",
            "timestamp": "2024-01-01T10:00:00Z"
        }
        result = ingestor.ingest(log)
        assert result is False
        assert ingestor.get_log_count() == 0

    def test_ingest_missing_required_field(self, ingestor):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        result = ingestor.ingest(log)
        assert result is False
        assert ingestor.get_log_count() == 0

    def test_ingest_question_answered_missing_time_to_answer(self, ingestor):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        result = ingestor.ingest(log)
        assert result is False

    def test_ingest_multiple_logs(self, ingestor, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            ingestor.ingest(log)
        assert ingestor.get_log_count() == len(sample_question_answered_logs)

    def test_ingest_mixed_log_types(self, ingestor, sample_question_answered_logs, sample_feedback_shown_logs):
        for log in sample_question_answered_logs:
            ingestor.ingest(log)
        for log in sample_feedback_shown_logs:
            ingestor.ingest(log)
        assert ingestor.get_log_count() == len(sample_question_answered_logs) + len(sample_feedback_shown_logs)

    def test_ingest_get_logs_by_type(self, ingestor, sample_question_answered_logs, sample_feedback_shown_logs):
        for log in sample_question_answered_logs:
            ingestor.ingest(log)
        for log in sample_feedback_shown_logs:
            ingestor.ingest(log)
        qa_logs = ingestor.get_logs_by_type("question_answered")
        fs_logs = ingestor.get_logs_by_type("feedback_shown")
        assert len(qa_logs) == len(sample_question_answered_logs)
        assert len(fs_logs) == len(sample_feedback_shown_logs)


class TestAverageSuccessRatio:
    def test_average_success_ratio_per_question(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert "q1" in ratios
        assert ratios["q1"] == 0.5
        assert ratios["q2"] == 1.0
        assert ratios["q3"] == 0.0

    def test_success_ratio_single_question(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios["q1"] == 1.0

    def test_success_ratio_no_logs(self, aggregator):
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios == {}

    def test_success_ratio_all_success(self, aggregator):
        for i in range(5):
            log = {
                "event_type": "question_answered",
                "question_id": "q1",
                "user_id": f"u{i}",
                "success": True,
                "time_to_answer_ms": 5000,
                "timestamp": "2024-01-01T10:00:00Z"
            }
            aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios["q1"] == 1.0

    def test_success_ratio_all_failure(self, aggregator):
        for i in range(5):
            log = {
                "event_type": "question_answered",
                "question_id": "q1",
                "user_id": f"u{i}",
                "success": False,
                "time_to_answer_ms": 5000,
                "timestamp": "2024-01-01T10:00:00Z"
            }
            aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios["q1"] == 0.0


class TestTimeToAnswerDistribution:
    def test_time_to_answer_distribution(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution()
        assert "min" in distribution
        assert "max" in distribution
        assert "mean" in distribution
        assert "median" in distribution
        assert "p25" in distribution
        assert "p75" in distribution
        assert "p90" in distribution
        assert "p95" in distribution
        assert "p99" in distribution
        assert distribution["min"] == 2000
        assert distribution["max"] == 35000

    def test_time_to_answer_distribution_single_entry(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution()
        assert distribution["min"] == 5000
        assert distribution["max"] == 5000
        assert distribution["mean"] == 5000
        assert distribution["median"] == 5000

    def test_time_to_answer_distribution_no_logs(self, aggregator):
        distribution = aggregator.get_time_to_answer_distribution()
        assert distribution == {}

    def test_time_to_answer_distribution_by_question(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution_by_question("q1")
        assert distribution["min"] == 5000
        assert distribution["max"] == 12000
        assert distribution["mean"] == 8500

    def test_time_to_answer_distribution_by_nonexistent_question(self, aggregator):
        distribution = aggregator.get_time_to_answer_distribution_by_question("nonexistent")
        assert distribution == {}

    def test_time_to_answer_histogram_buckets(self, aggregator):
        times = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
        for i, t in enumerate(times):
            log = {
                "event_type": "question_answered",
                "question_id": "q1",
                "user_id": f"u{i}",
                "success": True,
                "time_to_answer_ms": t,
                "timestamp": "2024-01-01T10:00:00Z"
            }
            aggregator.process_log(log)
        histogram = aggregator.get_time_to_answer_histogram()
        assert "0-5000" in histogram
        assert "5001-10000" in histogram
        assert histogram["0-5000"] == 5
        assert histogram["5001-10000"] == 5


class TestTopWorstPerformingQuestions:
    def test_top_5_worst_performing_questions(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        worst = aggregator.get_top_worst_performing_questions(limit=5)
        assert len(worst) == 5
        assert worst[0]["question_id"] == "q7"
        assert worst[0]["success_ratio"] == 0.0
        assert worst[1]["question_id"] == "q6"
        assert worst[1]["success_ratio"] == 0.0
        assert worst[2]["question_id"] == "q5"
        assert worst[2]["success_ratio"] == 0.0
        assert worst[3]["question_id"] == "q3"
        assert worst[3]["success_ratio"] == 0.0
        assert worst[4]["question_id"] == "q1"
        assert worst[4]["success_ratio"] == 0.5

    def test_top_worst_performing_questions_fewer_than_limit(self, aggregator):
        logs = [
            {
                "event_type": "question_answered",
                "question_id": "q1",
                "user_id": "u1",
                "success": True,
                "time_to_answer_ms": 5000,
                "timestamp": "2024-01-01T10:00:00Z"
            },
            {
                "event_type": "question_answered",
                "question_id": "q2",
                "user_id": "u2",
                "success": False,
                "time_to_answer_ms": 10000,
                "timestamp": "2024-01-01T10:01:00Z"
            }
        ]
        for log in logs:
            aggregator.process_log(log)
        worst = aggregator.get_top_worst_performing_questions(limit=5)
        assert len(worst) == 2
        assert worst[0]["question_id"] == "q2"
        assert worst[0]["success_ratio"] == 0.0
        assert worst[1]["question_id"] == "q1"
        assert worst[1]["success_ratio"] == 1.0

    def test_top_worst_performing_questions_no_logs(self, aggregator):
        worst = aggregator.get_top_worst_performing_questions(limit=5)
        assert worst == []

    def test_top_worst_performing_questions_sorted_by_ratio_then_time(self, aggregator):
        logs = [
            {
                "event_type": "question_answered",
                "question_id": "q1",
                "user_id": "u1",
                "success": False,
                "time_to_answer_ms": 10000,
                "timestamp": "2024-01-01T10:00:00Z"
            },
            {
                "event_type": "question_answered",
                "question_id": "q2",
                "user_id": "u2",
                "success": False,
                "time_to_answer_ms": 5000,
                "timestamp": "2024-01-01T10:01:00Z"
            }
        ]
        for log in logs:
            aggregator.process_log(log)
        worst = aggregator.get_top_worst_performing_questions(limit=5)
        assert worst[0]["question_id"] == "q1"
        assert worst[1]["question_id"] == "q2"

    def test_top_worst_performing_questions_includes_metadata(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        worst = aggregator.get_top_worst_performing_questions(limit=5)
        for item in worst:
            assert "question_id" in item
            assert "success_ratio" in item
            assert "total_answers" in item
            assert "avg_time_to_answer_ms" in item


class TestDashboardMetrics:
    def test_get_dashboard_metrics(self, aggregator, sample_question_answered_logs, sample_feedback_shown_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        for log in sample_feedback_shown_logs:
            aggregator.process_log(log)
        metrics = aggregator.get_dashboard_metrics()
        assert "average_success_ratio_per_question" in metrics
        assert "time_to_answer_distribution" in metrics
        assert "top_5_worst_performing_questions" in metrics
        assert "total_logs_ingested" in metrics
        assert metrics["total_logs_ingested"] == len(sample_question_answered_logs) + len(sample_feedback_shown_logs)

    def test_dashboard_metrics_empty(self, aggregator):
        metrics = aggregator.get_dashboard_metrics()
        assert metrics["average_success_ratio_per_question"] == {}
        assert metrics["time_to_answer_distribution"] == {}
        assert metrics["top_5_worst_performing_questions"] == []
        assert metrics["total_logs_ingested"] == 0

    def test_dashboard_metrics_success_ratio_structure(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        metrics = aggregator.get_dashboard_metrics()
        success_ratios = metrics["average_success_ratio_per_question"]
        assert isinstance(success_ratios, dict)
        for q_id, ratio in success_ratios.items():
            assert 0.0 <= ratio <= 1.0

    def test_dashboard_metrics_top_5_limit(self, aggregator):
        for i in range(10):
            log = {
                "event_type": "question_answered",
                "question_id": f"q{i}",
                "user_id": f"u{i}",
                "success": False,
                "time_to_answer_ms": 10000 + i * 1000,
                "timestamp": "2024-01-01T10:00:00Z"
            }
            aggregator.process_log(log)
        metrics = aggregator.get_dashboard_metrics()
        assert len(metrics["top_5_worst_performing_questions"]) == 5


class TestEdgeCases:
    def test_process_feedback_shown_log_does_not_affect_success_ratio(self, aggregator, sample_feedback_shown_logs):
        for log in sample_feedback_shown_logs:
            aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios == {}

    def test_process_feedback_shown_log_does_not_affect_time_distribution(self, aggregator, sample_feedback_shown_logs):
        for log in sample_feedback_shown_logs:
            aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution()
        assert distribution == {}

    def test_zero_time_to_answer(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 0,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution()
        assert distribution["min"] == 0
        assert distribution["max"] == 0
        assert distribution["mean"] == 0

    def test_very_large_time_to_answer(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 999999999,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        aggregator.process_log(log)
        distribution = aggregator.get_time_to_answer_distribution()
        assert distribution["max"] == 999999999

    def test_negative_time_to_answer_rejected(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": -1000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        result = aggregator.process_log(log)
        assert result is False
        assert aggregator.get_total_logs() == 0

    def test_duplicate_logs_handled(self, aggregator):
        log = {
            "event_type": "question_answered",
            "question_id": "q1",
            "user_id": "u1",
            "success": True,
            "time_to_answer_ms": 5000,
            "timestamp": "2024-01-01T10:00:00Z"
        }
        aggregator.process_log(log)
        aggregator.process_log(log)
        ratios = aggregator.get_average_success_ratio_per_question()
        assert ratios["q1"] == 1.0

    def test_reset_metrics(self, aggregator, sample_question_answered_logs):
        for log in sample_question_answered_logs:
            aggregator.process_log(log)
        aggregator.reset()
        assert aggregator.get_average_success_ratio_per_question() == {}
        assert aggregator.get_time_to_answer_distribution() == {}
        assert aggregator.get_top_worst_performing_questions(limit=5) == []
        assert aggregator.get_total_logs() == 0
