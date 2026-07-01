import pytest
from metrics_service import ingest_log, get_average_success_ratio, get_time_to_answer_distribution, get_top_5_worst_questions, reset_metrics

@pytest.fixture(autouse=True)
def reset_state():
    reset_metrics()
    yield

def test_ingest_question_answered_log():
    log = {
        "event": "question_answered",
        "question_id": "q1",
        "user_id": "u1",
        "success": True,
        "time_to_answer_ms": 1500
    }
    ingest_log(log)
    ratios = get_average_success_ratio()
    assert ratios.get("q1") == 1.0

def test_ingest_feedback_shown_log():
    log = {
        "event": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1"
    }
    ingest_log(log)
    ratios = get_average_success_ratio()
    assert "q1" not in ratios

def test_average_success_ratio():
    logs = [
        {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 200},
        {"event": "question_answered", "question_id": "q2", "success": True, "time_to_answer_ms": 300},
    ]
    for log in logs:
        ingest_log(log)
    
    ratios = get_average_success_ratio()
    assert ratios["q1"] == 0.5
    assert ratios["q2"] == 1.0

def test_time_to_answer_distribution():
    logs = [
        {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 200},
        {"event": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 300},
    ]
    for log in logs:
        ingest_log(log)
    
    dist = get_time_to_answer_distribution()
    assert dist["count"] == 3
    assert dist["min"] == 100
    assert dist["max"] == 300
    assert dist["avg"] == 200

def test_top_5_worst_performing_questions():
    logs = [
        {"event": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q2", "success": False, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q3", "success": False, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q4", "success": False, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q5", "success": False, "time_to_answer_ms": 100},
        {"event": "question_answered", "question_id": "q6", "success": True, "time_to_answer_ms": 100},
    ]
    for log in logs:
        ingest_log(log)
    
    worst = get_top_5_worst_questions()
    assert len(worst) == 5
    worst_ids = [item["question_id"] for item in worst]
    assert "q6" not in worst_ids
    assert set(worst_ids) == {"q1", "q2", "q3", "q4", "q5"}
