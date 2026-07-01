import pytest
from qa_metrics import MetricsService

@pytest.fixture
def metrics_service():
    return MetricsService()

def test_ingest_question_answered_log(metrics_service):
    log = {
        "event_type": "question_answered",
        "question_id": "q1",
        "user_id": "u1",
        "success": True,
        "time_to_answer_ms": 1500
    }
    metrics_service.ingest_log(log)
    assert metrics_service.get_total_logs() == 1

def test_ingest_feedback_shown_log(metrics_service):
    log = {
        "event_type": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1"
    }
    metrics_service.ingest_log(log)
    assert metrics_service.get_total_logs() == 1

def test_average_success_ratio_per_question(metrics_service):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1000},
        {"event_type": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 2000},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1500},
    ]
    for log in logs:
        metrics_service.ingest_log(log)
    
    ratios = metrics_service.get_average_success_ratio_per_question()
    assert "q1" in ratios
    assert ratios["q1"] == pytest.approx(2/3)

def test_time_to_answer_distribution(metrics_service):
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 500},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1500},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 3500},
    ]
    for log in logs:
        metrics_service.ingest_log(log)
    
    distribution = metrics_service.get_time_to_answer_distribution()
    # Assuming standard buckets like 0-1000, 1000-2000, 2000-3000, 3000-4000
    assert distribution.get("0-1000", 0) == 1
    assert distribution.get("1000-2000", 0) == 1
    assert distribution.get("3000-4000", 0) == 1

def test_top_5_worst_performing_questions(metrics_service):
    # q1: 0% success
    # q2: 20% success
    # q3: 40% success
    # q4: 60% success
    # q5: 80% success
    # q6: 100% success
    questions = ["q1", "q2", "q3", "q4", "q5", "q6"]
    for i, q in enumerate(questions):
        for _ in range(i):
            metrics_service.ingest_log({"event_type": "question_answered", "question_id": q, "success": True, "time_to_answer_ms": 1000})
        for _ in range(5 - i):
            metrics_service.ingest_log({"event_type": "question_answered", "question_id": q, "success": False, "time_to_answer_ms": 1000})
            
    worst = metrics_service.get_top_5_worst_questions()
    assert len(worst) == 5
    assert worst[0]["question_id"] == "q1"
    assert worst[1]["question_id"] == "q2"
    assert worst[2]["question_id"] == "q3"
    assert worst[3]["question_id"] == "q4"
    assert worst[4]["question_id"] == "q5"

def test_ignore_invalid_log_type(metrics_service):
    log = {
        "event_type": "invalid_event",
        "question_id": "q1",
        "user_id": "u1"
    }
    metrics_service.ingest_log(log)
    assert metrics_service.get_total_logs() == 0
