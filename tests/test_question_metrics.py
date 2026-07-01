import pytest
from unittest.mock import MagicMock
from app.services.metrics_service import QuestionMetricsService

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.question_metrics = MagicMock()
    return db

@pytest.fixture
def metrics_service(mock_db):
    return QuestionMetricsService(mock_db)

def test_top_5_worst_performing_questions_returns_exactly_5(metrics_service, mock_db):
    mock_db.question_metrics.aggregate.return_value = [
        {"question_id": f"q{i}", "success_rate": i * 10} for i in range(10, 0, -1)
    ]
    
    result = metrics_service.get_top_5_worst_performing_questions()
    
    assert len(result) == 5, f"Expected 5 questions, but received {len(result)}"
    assert result[0]["question_id"] == "q10"
    assert result[4]["question_id"] == "q6"

def test_top_5_worst_performing_questions_returns_fewer_if_less_than_5(metrics_service, mock_db):
    mock_db.question_metrics.aggregate.return_value = [
        {"question_id": f"q{i}", "success_rate": i * 10} for i in range(3, 0, -1)
    ]
    
    result = metrics_service.get_top_5_worst_performing_questions()
    
    assert len(result) == 3, f"Expected 3 questions, but received {len(result)}"
    assert result[0]["question_id"] == "q3"

def test_aggregation_pipeline_has_correct_sort_and_limit(metrics_service, mock_db):
    mock_db.question_metrics.aggregate.return_value = []
    
    metrics_service.get_top_5_worst_performing_questions()
    
    mock_db.question_metrics.aggregate.assert_called_once()
    pipeline = mock_db.question_metrics.aggregate.call_args[0][0]
    
    sort_stage = next((stage for stage in pipeline if "$sort" in stage), None)
    assert sort_stage is not None, "Pipeline is missing $sort stage"
    assert sort_stage["$sort"].get("success_rate") == 1, "Pipeline should sort by success_rate ascending"
    
    limit_stage = next((stage for stage in pipeline if "$limit" in stage), None)
    assert limit_stage is not None, "Pipeline is missing $limit stage"
    assert limit_stage["$limit"] == 5, "Pipeline should limit to 5"
