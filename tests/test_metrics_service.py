import pytest
from unittest.mock import MagicMock, patch
from app.services.metrics_service import get_top_worst_performing_questions

@pytest.fixture
def mock_metrics_collection():
    with patch('app.services.metrics_service.metrics_collection') as mock:
        yield mock

def test_top_5_worst_performing_questions(mock_metrics_collection):
    """
    Test that exactly 5 questions are returned when there are more than 5 in the database.
    Addresses TRIOFSND-22: Expected 5 questions, but received 3.
    """
    mock_data = [
        {"_id": "q1", "question_id": "q1", "success_rate": 0.1, "total_answers": 10},
        {"_id": "q2", "question_id": "q2", "success_rate": 0.2, "total_answers": 10},
        {"_id": "q3", "question_id": "q3", "success_rate": 0.3, "total_answers": 10},
        {"_id": "q4", "question_id": "q4", "success_rate": 0.4, "total_answers": 10},
        {"_id": "q5", "question_id": "q5", "success_rate": 0.5, "total_answers": 10},
        {"_id": "q6", "question_id": "q6", "success_rate": 0.6, "total_answers": 10},
        {"_id": "q7", "question_id": "q7", "success_rate": 0.7, "total_answers": 10},
    ]
    
    def mock_aggregate(pipeline):
        # Verify the pipeline contains a $limit stage with value 5
        limit_stage = next((stage for stage in pipeline if '$limit' in stage), None)
        assert limit_stage is not None, "Aggregation pipeline is missing $limit stage"
        assert limit_stage['$limit'] == 5, f"Expected $limit to be 5, got {limit_stage['$limit']}"
        
        # Verify the pipeline contains a $sort stage
        sort_stage = next((stage for stage in pipeline if '$sort' in stage), None)
        assert sort_stage is not None, "Aggregation pipeline is missing $sort stage"
        
        # Return exactly 5 items as expected from the limit
        return mock_data[:limit_stage['$limit']]

    mock_metrics_collection.aggregate = MagicMock(side_effect=mock_aggregate)

    result = get_top_worst_performing_questions(limit=5)

    assert len(result) == 5, f"Expected 5 questions, but received {len(result)}"
    # Ensure it's sorted by worst performing (ascending success_rate)
    assert result[0]['question_id'] == 'q1'
    assert result[4]['question_id'] == 'q5'

def test_top_5_worst_performing_questions_empty(mock_metrics_collection):
    """
    Test behavior when there are no questions logged.
    """
    mock_metrics_collection.aggregate = MagicMock(return_value=[])
    result = get_top_worst_performing_questions(limit=5)
    assert len(result) == 0

def test_top_5_worst_performing_questions_less_than_5(mock_metrics_collection):
    """
    Test behavior when there are fewer than 5 questions logged.
    """
    mock_data = [
        {"_id": "q1", "question_id": "q1", "success_rate": 0.1},
        {"_id": "q2", "question_id": "q2", "success_rate": 0.2},
    ]
    
    def mock_aggregate(pipeline):
        limit_stage = next((stage for stage in pipeline if '$limit' in stage), None)
        assert limit_stage is not None
        assert limit_stage['$limit'] == 5
        return mock_data[:limit_stage['$limit']]

    mock_metrics_collection.aggregate = MagicMock(side_effect=mock_aggregate)
    result = get_top_worst_performing_questions(limit=5)
    assert len(result) == 2
