import pytest
from unittest.mock import patch
from metrics_service import ingest_log, get_average_success_ratio_per_question, get_time_to_answer_distribution, get_top_5_worst_performing_questions

@pytest.fixture(autouse=True)
def reset_metrics():
    # Reset metrics before each test
    with patch('metrics_service.metrics_store') as mock_store:
        mock_store.reset()
        yield

def test_top_5_worst_performing_questions():
    # q1: 0% success (5 attempts), q2: 20% (5 attempts), q3: 40% (5 attempts), q4: 60% (5 attempts), q5: 80% (5 attempts), q6: 100% (5 attempts)
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
