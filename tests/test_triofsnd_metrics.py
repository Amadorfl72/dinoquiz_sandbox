import pytest
from triofsnd_metrics import ingest_log, get_metrics, reset_metrics

@pytest.fixture
def clear_metrics():
    reset_metrics()
    yield

def test_ingest_question_answered_log(clear_metrics):
    log = {
        "event_type": "question_answered",
        "question_id": "q1",
        "user_id": "u1",
        "is_correct": True,
        "time_to_answer_ms": 1500
    }
    ingest_log(log)
    metrics = get_metrics()
    assert "q1" in metrics["questions"]

def test_ingest_feedback_shown_log(clear_metrics):
    log = {
        "event_type": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1",
        "feedback_type": "explanation"
    }
    ingest_log(log)
    metrics = get_metrics()
    assert metrics is not None

def test_average_success_ratio_per_question(clear_metrics):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "is_correct": True, "time_to_answer_ms": 1000},
        {"event_type": "question_answered", "question_id": "q1", "is_correct": False, "time_to_answer_ms": 2000},
        {"event_type": "question_answered", "question_id": "q1", "is_correct": True, "time_to_answer_ms": 1500},
    ]
    for log in logs:
        ingest_log(log)
    
    metrics = get_metrics()
    assert metrics["questions"]["q1"]["success_ratio"] == pytest.approx(2/3)

def test_time_to_answer_distribution(clear_metrics):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q1", "is_correct": True, "time_to_answer_ms": 200},
        {"event_type": "question_answered", "question_id": "q1", "is_correct": True, "time_to_answer_ms": 300},
    ]
    for log in logs:
        ingest_log(log)
        
    metrics = get_metrics()
    dist = metrics["time_to_answer_distribution"]
    assert dist["min"] == 100
    assert dist["max"] == 300
    assert dist["avg"] == 200

def test_top_5_worst_performing_questions(clear_metrics):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q2", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q3", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q4", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "is_correct": False, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q5", "is_correct": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q6", "is_correct": True, "time_to_answer_ms": 100},
    ]
    for log in logs:
        ingest_log(log)
        
    metrics = get_metrics()
    worst = metrics["top_5_worst_questions"]
    assert len(worst) == 5
    assert worst[0]["question_id"] == "q1"
    assert worst[1]["question_id"] == "q2"
    assert worst[2]["question_id"] == "q3"
    assert worst[3]["question_id"] == "q4"
    assert worst[4]["question_id"] == "q5"