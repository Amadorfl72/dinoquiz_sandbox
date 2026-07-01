import pytest
from app.metrics import time_to_answer_ms_histogram, aggregate_time_to_answer_events

def test_aggregate_time_to_answer_distribution():
    """
    TRIOFSND-22: Ensure the aggregation pipeline correctly maps the duration field.
    Expected histogram metric for time_to_answer_ms but received null.
    """
    events = [
        {"event_type": "question_answered", "time_to_answer_ms": 1200},
        {"event_type": "question_answered", "time_to_answer_ms": 3400},
    ]
    
    aggregate_time_to_answer_events(events)
    
    metric_value = time_to_answer_ms_histogram.collect()
    assert metric_value is not None, "Expected histogram metric for time_to_answer_ms but received null"
    
    samples = metric_value.samples
    assert len(samples) > 0
    
    sum_sample = [s for s in samples if s.name == "time_to_answer_ms_sum"][0]
    count_sample = [s for s in samples if s.name == "time_to_answer_ms_count"][0]
    
    assert sum_sample.value == 4600.0
    assert count_sample.value == 2.0

def test_aggregate_time_to_answer_distribution_maps_duration_field():
    """
    TRIOFSND-22: Ensure the duration field is correctly mapped to the histogram.
    """
    events = [
        {"event_type": "question_answered", "time_to_answer_ms": 5000},
    ]
    
    aggregate_time_to_answer_events(events)
    
    metric_value = time_to_answer_ms_histogram.collect()
    assert metric_value is not None, "Expected histogram metric for time_to_answer_ms but received null"
    
    sum_sample = [s for s in metric_value.samples if s.name == "time_to_answer_ms_sum"][0]
    count_sample = [s for s in metric_value.samples if s.name == "time_to_answer_ms_count"][0]
    
    assert sum_sample.value == 5000.0
    assert count_sample.value == 1.0

def test_aggregate_time_to_answer_distribution_empty_events():
    """
    TRIOFSND-22: Ensure the metric is initialized and not null even with no events.
    """
    events = []
    
    aggregate_time_to_answer_events(events)
    
    metric_value = time_to_answer_ms_histogram.collect()
    assert metric_value is not None, "Expected histogram metric for time_to_answer_ms but received null"
    
    count_sample = [s for s in metric_value.samples if s.name == "time_to_answer_ms_count"][0]
    assert count_sample.value == 0.0