import pytest
from app.services.metrics_service import MetricsAggregator

class TestMetricsAggregator:
    def setup_method(self):
        self.aggregator = MetricsAggregator()

    def test_aggregate_time_to_answer_distribution(self):
        # Simulate raw events where the duration field is present
        raw_events = [
            {"event_id": "1", "type": "question_answered", "duration": 1500},
            {"event_id": "2", "type": "question_answered", "duration": 2500},
            {"event_id": "3", "type": "question_answered", "duration": 500}
        ]

        # Execute the aggregation pipeline
        result = self.aggregator.aggregate(raw_events)

        # Assert that the histogram metric for time_to_answer_ms is not null
        assert result is not None, "Aggregation result should not be null"
        
        # Ensure the metric is correctly mapped from the 'duration' field
        assert "time_to_answer_ms" in result, "time_to_answer_ms metric should be present in the result"
        assert result["time_to_answer_ms"] is not None, "Expected histogram metric for time_to_answer_ms but received null"
        
        histogram = result["time_to_answer_ms"]
        assert histogram["type"] == "histogram"
        assert histogram["count"] == 3
        assert histogram["sum"] == 4500
        
        # Verify buckets are correctly populated
        expected_buckets = {
            "0": 0,
            "1000": 1,
            "2000": 1,
            "3000": 1,
            "+Inf": 3
        }
        assert histogram["buckets"] == expected_buckets

    def test_aggregate_time_to_answer_distribution_empty(self):
        raw_events = []
        result = self.aggregator.aggregate(raw_events)
        
        assert result is not None
        assert "time_to_answer_ms" in result
        assert result["time_to_answer_ms"] is not None
        assert result["time_to_answer_ms"]["count"] == 0
        assert result["time_to_answer_ms"]["sum"] == 0

    def test_aggregate_time_to_answer_distribution_missing_duration(self):
        # Events missing the duration field should be handled gracefully and not break aggregation
        raw_events = [
            {"event_id": "1", "type": "question_answered", "duration": 1500},
            {"event_id": "2", "type": "question_answered"}, 
            {"event_id": "3", "type": "question_answered", "duration": 500}
        ]
        
        result = self.aggregator.aggregate(raw_events)
        
        assert result is not None
        assert "time_to_answer_ms" in result
        assert result["time_to_answer_ms"] is not None
        
        histogram = result["time_to_answer_ms"]
        assert histogram["count"] == 2
        assert histogram["sum"] == 2000
