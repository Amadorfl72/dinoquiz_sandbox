import pytest
from unittest.mock import patch
from metrics_service import ingest_log, get_average_success_ratio_per_question, get_time_to_answer_distribution, get_top_5_worst_performing_questions

@pytest.fixture(autouse=True)
def reset_metrics():
    # Reset metrics before each test
    with patch('metrics_service.metrics_store') as mock_store:
        mock_store.reset()
        yield

def test_ingest_question_answered_log():
    log_data = {
        "event_type": "question_answered",
        "question_id": "q1",
        "user_id": "u1",
        "success": True,
        "time_to_answer_ms": 1500
    }
    result = ingest_log(log_data)
    assert result is True

def test_ingest_feedback_shown_log():
    log_data = {
        "event_type": "feedback_shown",
        "question_id": "q1",
        "user_id": "u1",
        "feedback_type": "positive"
    }
    result = ingest_log(log_data)
    assert result is True

def test_ingest_invalid_log():
    log_data = {
        "event_type": "invalid_event",
        "question_id": "q1"
    }
    result = ingest_log(log_data)
    assert result is False

def test_average_success_ratio_per_question():
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q1", "success": False, "time_to_answer_ms": 200},
        {"event_type": "question_answered", "question_id": "q2", "success": True, "time_to_answer_ms": 300},
    ]
    for log in logs:
        ingest_log(log)
    
    ratios = get_average_success_ratio_per_question()
    assert ratios["q1"] == 0.5
    assert ratios["q2"] == 1.0

def test_time_to_answer_distribution():
    logs = [
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 100},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 1500},
        {"event_type": "question_answered", "question_id": "q1", "success": True, "time_to_answer_ms": 3500},
    ]
    for log in logs:
        ingest_log(log)
    
    distribution = get_time_to_answer_distribution()
    # Assuming buckets: 0-1000, 1000-3000, 3000+
    assert distribution["0-1000"] == 1
    assert distribution["1000-3000"] == 1
    assert distribution["3000+"] == 1

def test_top_5_worst_performing_questions():
    # q1: 0% success, q2: 20%, q3: 40%, q4: 60%, q5: 80%, q6: 100%
    questions = ["q1", "q2", "q3", "q4", "q5", "q6"]
    success_rates = [0, 1, 2, 3, 4, 5] # out of 5
    
    for i, q in enumerate(questions):
        for j in range(5):
            ingest_log({
                "event_type": "question_answered",
                "question_id": q,
                "success": j < success_rates[i],
                "time_to_answer_ms": 100
            })
            
    worst = get_top_5_worst_performing_questions()
    assert len(worst) == 5
    assert worst[0]["question_id"] == "q1"
    assert worst[1]["question_id"] == "q2"
    assert worst[2]["question_id"] == "q3"
    assert worst[3]["question_id"] == "q4"
    assert worst[4]["question_id"] == "q5"
