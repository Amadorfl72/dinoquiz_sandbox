import pytest
from metrics_aggregator import MetricsAggregator

@pytest.fixture
def aggregator():
    return MetricsAggregator()

def test_ingest_question_answered_log(aggregator):
    log = {
        "event_type": "question_answered",
        "question_id": "q1",
        "user_id": "u1",
        "success": True,
        "time_to_answer_ms": 1200
    }
    aggregator.ingest(log)
    assert len(aggregator.logs) == 1
    assert aggregator.logs[0]["event_type"] == "question_answered"

def test_ingest_feedback_shown_log(aggregator):
    log = {
        "event_type": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1",
        "feedback_type": "correct"
    }
    aggregator.ingest(log)
    assert len(aggregator.logs) == 1
    assert aggregator.logs[0]["event_type"] == "feedback_shown"

def test_ingest_invalid_log_type(aggregator):
    log = {
        "event_type": "invalid_event",
        "question_id": "q1",
        "user_id": "u1"
    }
    with pytest.raises(ValueError):
        aggregator.ingest(log)

def test_feedback_shown_does_not_affect_question_stats(aggregator):
    log = {
        "event_type": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1",
        "feedback_type": "correct"
    }
    aggregator.ingest(log)
    assert aggregator.question_stats == {}

def test_average_success_ratio(aggregator):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 200},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 150},
        {"event_type": "question_answered", "question_id": "q2", "success": False, "time_to_answer_ms": 300},
        {"event_type": "question_answered", "question_id": "q2", "success": False, "time_to_answer_ms": 400},
    ]
    for log in logs:
        aggregator.ingest(log)
    
    ratios = aggregator.get_average_success_ratio()
    assert ratios["q1"] == pytest.approx(2/3)
    assert ratios["q2"] == 0.0

def test_time_to_answer_distribution(aggregator):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 200},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 300},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 400},
    ]
    for log in logs:
        aggregator.ingest(log)
        
    dist = aggregator.get_time_to_answer_distribution()
    assert dist["min"] == 100
    assert dist["max"] == 400
    assert dist["avg"] == 250
    assert dist["count"] == 4

def test_top_5_worst_questions(aggregator):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "success": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "success": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "success": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "success": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q6", "success": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q7", "success": True, "time_to_answer_ms": 100},
    ]
    for log in logs:
        aggregator.ingest(log)
        
    worst = aggregator.get_top_5_worst_questions()
    assert len(worst) == 5
    worst_ids = [q["question_id"] for q in worst]
    assert "q1" not in worst_ids
    assert "q7" not in worst_ids
    assert "q2" in worst_ids
    assert "q3" in worst_ids
    assert "q4" in worst_ids
    assert "q5" in worst_ids
    assert "q6" in worst_ids

def test_empty_metrics(aggregator):
    assert aggregator.get_average_success_ratio() == {}
    assert aggregator.get_time_to_answer_distribution() == {}
    assert aggregator.get_top_5_worst_questions() == []
