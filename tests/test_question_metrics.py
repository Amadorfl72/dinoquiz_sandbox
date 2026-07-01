import pytest
from unittest.mock import patch, MagicMock
from app.services.metrics_service import get_top_5_worst_performing_questions

# Mock data representing question metrics
mock_metrics_data = [
    {"question_id": "q1", "success_rate": 0.1, "total_attempts": 10},
    {"question_id": "q2", "success_rate": 0.2, "total_attempts": 10},
    {"question_id": "q3", "success_rate": 0.3, "total_attempts": 10},
    {"question_id": "q4", "success_rate": 0.4, "total_attempts": 10},
    {"question_id": "q5", "success_rate": 0.5, "total_attempts": 10},
    {"question_id": "q6", "success_rate": 0.6, "total_attempts": 10},
    {"question_id": "q7", "success_rate": 0.7, "total_attempts": 10},
    {"question_id": "q8", "success_rate": 0.8, "total_attempts": 10},
]

@pytest.fixture
def mock_db_collection():
    with patch('app.services.metrics_service.db.question_metrics') as mock_collection:
        yield mock_collection

def test_top_5_worst_performing_questions(mock_db_collection):
    """
    Test that the aggregation pipeline correctly sorts by worst performance
    and limits the results to exactly 5 questions.
    """
    def aggregate_side_effect(pipeline):
        # Simulate the aggregation pipeline execution based on the provided pipeline
        limit = None
        sort_field = None
        sort_order = 1
        
        for stage in pipeline:
            if "$limit" in stage:
                limit = stage["$limit"]
            if "$sort" in stage:
                for k, v in stage["$sort"].items():
                    sort_field = k
                    sort_order = v

        # Simulate sorting
        sorted_data = sorted(mock_metrics_data, key=lambda x: x.get(sort_field, 0), reverse=(sort_order == -1))
        
        # Simulate limiting
        if limit:
            return iter(sorted_data[:limit])
        return iter(sorted_data)

    mock_db_collection.aggregate.side_effect = aggregate_side_effect

    result = get_top_5_worst_performing_questions()

    # Assert that exactly 5 questions are returned
    assert len(result) == 5, f"Expected 5 questions, but received {len(result)}"
    
    # Verify they are the worst performing (lowest success_rate)
    expected_ids = ["q1", "q2", "q3", "q4", "q5"]
    actual_ids = [item["question_id"] for item in result]
    assert actual_ids == expected_ids, "Questions are not sorted correctly or wrong items returned"

    # Verify the pipeline contained a limit of 5
    called_pipeline = mock_db_collection.aggregate.call_args[0][0]
    limit_stage = next((stage for stage in called_pipeline if "$limit" in stage), None)
    assert limit_stage is not None, "Pipeline is missing $limit stage"
    assert limit_stage["$limit"] == 5, "Pipeline $limit is not set to 5"

    # Verify the pipeline contained a sort stage
    sort_stage = next((stage for stage in called_pipeline if "$sort" in stage), None)
    assert sort_stage is not None, "Pipeline is missing $sort stage"
    assert "success_rate" in sort_stage["$sort"], "Pipeline is not sorting by success_rate"
    assert sort_stage["$sort"]["success_rate"] == 1, "Pipeline should sort by success_rate ascending (worst first)"
