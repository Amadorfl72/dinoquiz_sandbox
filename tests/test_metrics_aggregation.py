import pytest
from app.metrics.aggregator import aggregate_time_to_answer

def test_aggregate_time_to_answer_distribution():
    """
    Test that the aggregation pipeline correctly maps the duration field
    to the time_to_answer_ms histogram metric.
    """
    # Sample data simulating answered questions with duration in milliseconds
    sample_data = [
        {"event": "question_answered", "duration": 120},
        {"event": "question_answered", "duration": 450},
        {"event": "question_answered", "duration": 800},
    ]

    # Run the aggregation pipeline
    result = aggregate_time_to_answer(sample_data)

    # Ensure the metric is not null
    assert result is not None, "Expected histogram metric for time_to_answer_ms but received null. Ensure the aggregation pipeline correctly maps the duration field."
    
    # Ensure the metric name is correct
    assert result.get("name") == "time_to_answer_ms"
    
    # Ensure it's a histogram type
    assert result.get("type") == "histogram"
    
    # Check if the values are correctly aggregated
    assert result.get("count") == 3
    assert result.get("sum") == 1370
    
    # Check buckets (assuming standard buckets: 100, 200, 500, 1000)
    buckets = result.get("buckets", {})
    assert buckets.get("100") == 0
    assert buckets.get("200") == 1
    assert buckets.get("500") == 2
    assert buckets.get("1000") == 3
    assert buckets.get("+Inf") == 3

def test_aggregate_time_to_answer_distribution_empty():
    """
    Test that the aggregation pipeline handles empty data gracefully
    and still returns a valid (but empty) histogram metric.
    """
    sample_data = []
    result = aggregate_time_to_answer(sample_data)
    
    assert result is not None, "Expected histogram metric for time_to_answer_ms but received null."
    assert result.get("name") == "time_to_answer_ms"
    assert result.get("count") == 0
    assert result.get("sum") == 0

def test_aggregate_time_to_answer_distribution_missing_duration():
    """
    Test that the aggregation pipeline handles missing duration fields
    without crashing and ignores invalid entries.
    """
    sample_data = [
        {"event": "question_answered", "duration": 150},
        {"event": "question_answered"}, # missing duration
        {"event": "question_answered", "duration": 250},
    ]
    
    result = aggregate_time_to_answer(sample_data)
    
    assert result is not None, "Expected histogram metric for time_to_answer_ms but received null."
    assert result.get("count") == 2
    assert result.get("sum") == 400
