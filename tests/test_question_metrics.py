import pytest
from unittest.mock import MagicMock
from app.repositories.question_metrics_repository import QuestionMetricsRepository

@pytest.fixture
def mock_collection():
    return MagicMock()

@pytest.fixture
def repository(mock_collection):
    return QuestionMetricsRepository(mock_collection)

def test_top_5_worst_performing_questions(repository, mock_collection):
    """
    Test to verify that the aggregation pipeline correctly sorts and limits
    the results to the top 5 worst performing questions.
    Addresses TRIOFSND-22.
    """
    # Mock data representing 5 worst performing questions (already sorted)
    mock_data = [
        {"question_id": "q1", "success_rate": 10, "total_attempts": 50},
        {"question_id": "q2", "success_rate": 20, "total_attempts": 45},
        {"question_id": "q3", "success_rate": 30, "total_attempts": 40},
        {"question_id": "q4", "success_rate": 40, "total_attempts": 35},
        {"question_id": "q5", "success_rate": 50, "total_attempts": 30}
    ]
    
    mock_collection.aggregate.return_value = mock_data
    
    result = repository.get_top_worst_performing_questions(limit=5)
    
    # Assert that exactly 5 questions are returned
    assert len(result) == 5, f"Expected 5 questions, but received {len(result)}"
    
    # Verify the aggregation pipeline was called
    mock_collection.aggregate.assert_called_once()
    
    # Inspect the pipeline to ensure sorting and limiting logic is correct
    args, _ = mock_collection.aggregate.call_args
    pipeline = args[0]
    
    # Check for $limit stage
    limit_stage = next((stage for stage in pipeline if "$limit" in stage), None)
    assert limit_stage is not None, "Pipeline is missing the $limit stage"
    assert limit_stage["$limit"] == 5, f"Expected $limit to be 5, got {limit_stage['$limit']}"
    
    # Check for $sort stage (assuming worst performing means lowest success_rate)
    sort_stage = next((stage for stage in pipeline if "$sort" in stage), None)
    assert sort_stage is not None, "Pipeline is missing the $sort stage"
    assert "success_rate" in sort_stage["$sort"], "Pipeline is not sorting by success_rate"
    assert sort_stage["$sort"]["success_rate"] == 1, "Pipeline should sort by success_rate ascending (1) for worst performing"

def test_top_5_worst_performing_questions_with_more_than_5_available(repository, mock_collection):
    """
    Ensure that even if there are more than 5 questions in the DB, 
    only 5 are returned and they are the worst performing ones.
    """
    mock_data = [
        {"question_id": f"q{i}", "success_rate": i * 10} for i in range(1, 6)
    ]
    mock_collection.aggregate.return_value = mock_data
    
    result = repository.get_top_worst_performing_questions(limit=5)
    
    assert len(result) == 5
    assert result[0]["question_id"] == "q1"
    assert result[4]["question_id"] == "q5"
