import pytest
from app.metrics_aggregator import MetricsAggregator

@pytest.fixture
def aggregator():
    return MetricsAggregator()

@pytest.fixture
def populated_aggregator(aggregator):
    logs = [
        {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1200},
        {"event": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 2500},
        {"event": "question_answered", "question_id": "q2", "success": True, "time_to_answer_ms": 800},
        {"event": "question_answered", "question_id": "q3", "success": False, "time_to_answer_ms": 3000},
        {"event": "question_answered", "question_id": "q4", "success": False, "time_to_answer_ms": 4000},
        {"event": "question_answered", "question_id": "q5", "success": False, "time_to_answer_ms": 5000},
        {"event": "question_answered", "question_id": "q6", "success": False, "time_to_answer_ms": 6000},
        {"event": "question_answered", "question_id": "q7", "success": False, "time_to_answer_ms": 7000},
        {"event": "feedback_shown", "question_id": "q1", "feedback_type": "incorrect"}
    ]
    for log in logs:
        aggregator.ingest(log)
    return aggregator

def test_ingest_question_answered(aggregator):
    log = {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1200}
    aggregator.ingest(log)
    assert "q1" in aggregator.questions
    assert aggregator.questions["q1"]["total"] == 1
    assert aggregator.questions["q1"]["successes"] == 1

def test_ingest_feedback_shown(aggregator):
    log = {"event": "feedback_shown", "question_id": "q1", "feedback_type": "correct"}
    aggregator.ingest(log)
    # Should not throw error and should not affect question metrics
    assert "q1" not in aggregator.questions

def test_average_success_ratio(populated_aggregator):
    ratios = populated_aggregator.get_average_success_ratio()
    assert ratios["q1"] == 0.5
    assert ratios["q2"] == 1.0
    assert ratios["q3"] == 0.0

def test_time_to_answer_distribution(populated_aggregator):
    dist = populated_aggregator.get_time_to_answer_distribution()
    assert "q1" in dist
    assert dist["q1"]["avg"] == 1850.0
    assert dist["q1"]["min"] == 1200
    assert dist["q1"]["max"] == 2500

def test_top_5_worst_performing_questions(populated_aggregator):
    worst = populated_aggregator.get_top_5_worst_performing_questions()
    assert len(worst) == 5
    # q2 has 100% success, so it should not be in the worst 5
    assert "q2" not in worst
    # q7, q6, q5, q4, q3 all have 0% success, sorted by time_to_answer_ms descending
    assert worst[0] == "q7"
    assert worst[1] == "q6"
    assert worst[2] == "q5"
    assert worst[3] == "q4"
    assert worst[4] == "q3"

def test_ingest_invalid_event(aggregator):
    log = {"event": "invalid_event", "question_id": "q1"}
    with pytest.raises(ValueError):
        aggregator.ingest(log)

def test_ingest_missing_fields(aggregator):
    log = {"event": "question_answered", "question_id": "q1"}
    with pytest.raises(KeyError):
        aggregator.ingest(log)

def test_top_5_with_fewer_questions(aggregator):
    # Test with only 3 questions to ensure we still get 5 results
    logs = [
        {"event": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 1000},
        {"event": "question_answered", "question_id": "q2", "success": False, "time_to_answer_ms": 2000},
        {"event": "question_answered", "question_id": "q3", "success": True, "time_to_answer_ms": 500}
    ]
    for log in logs:
        aggregator.ingest(log)
    worst = aggregator.get_top_5_worst_performing_questions()
    assert len(worst) == 5  # Should return 5 items even with only 3 questions
    assert "q1" in worst
    assert "q2" in worst
    assert "q3" not in worst  # q3 has 100% success