import pytest
from app.aggregation import aggregate_metrics

def test_aggregate_time_to_answer_distribution():
    """
    Test that the aggregation pipeline correctly maps the 'duration' field
    to the 'time_to_answer_ms' histogram metric.
    """
    events = [
        {"event_id": "1", "type": "question_answered", "duration": 1200},
        {"event_id": "2", "type": "question_answered", "duration": 1800},
        {"event_id": "3", "type": "question_answered", "duration": 2400},
        {"event_id": "4", "type": "question_answered", "duration": 3000},
    ]
    
    metrics = aggregate_metrics(events)
    
    assert metrics is not None, "Metrics aggregation returned None"
    
    # Ensure the time_to_answer_ms histogram metric is not null
    assert "time_to_answer_ms" in metrics, "time_to_answer_ms metric is missing"
    assert metrics["time_to_answer_ms"] is not None, "Expected histogram metric for time_to_answer_ms but received null"
    
    histogram = metrics["time_to_answer_ms"]
    
    # Validate histogram structure
    assert isinstance(histogram, dict)
    assert "count" in histogram
    assert "sum" in histogram
    assert "buckets" in histogram
    
    # Validate histogram values based on the duration field mapping
    assert histogram["count"] == 4
    assert histogram["sum"] == 1200 + 1800 + 2400 + 3000
    
    # Check if buckets are correctly populated (assuming standard boundaries)
    # e.g., boundaries: 1000, 2000, 3000, 4000
    buckets = histogram["buckets"]
    assert buckets.get("1000", 0) == 0
    assert buckets.get("2000", 0) == 2  # 1200, 1800
    assert buckets.get("3000", 0) == 1  # 2400
    assert buckets.get("4000", 0) == 1  # 3000
    assert buckets.get("+Inf", 0) == 4

def test_aggregate_time_to_answer_distribution_empty():
    """
    Test aggregation pipeline with no events to ensure it doesn't crash
    and returns a valid, empty histogram structure instead of null.
    """
    events = []
    
    metrics = aggregate_metrics(events)
    
    assert metrics is not None
    assert "time_to_answer_ms" in metrics
    assert metrics["time_to_answer_ms"] is not None, "Expected histogram metric for time_to_answer_ms but received null"
    
    histogram = metrics["time_to_answer_ms"]
    assert histogram["count"] == 0
    assert histogram["sum"] == 0
