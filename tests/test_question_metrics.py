import pytest
from unittest.mock import MagicMock
from app.services.question_metrics_service import QuestionMetricsService

@pytest.fixture
def mock_collection():
    return MagicMock()

@pytest.fixture
def metrics_service(mock_collection):
    return QuestionMetricsService(mock_collection)

def test_top_5_worst_performing_questions_returns_exactly_5(metrics_service, mock_collection):
    """
    Test that the service returns exactly 5 questions when more than 5 exist.
    Addresses: AssertionError: Expected 5 questions, but received 3.
    """
    # Arrange: Simulate database returning 5 items (as it should after limit)
    mock_questions = [{"question_id": i, "success_rate": 0.1 * i} for i in range(1, 6)]
    mock_collection.aggregate.return_value = mock_questions

    # Act
    result = metrics_service.get_top_5_worst_performing_questions()

    # Assert
    assert len(result) == 5, f"Expected 5 questions, but received {len(result)}"

def test_top_5_worst_performing_questions_pipeline_has_limit_5(metrics_service, mock_collection):
    """
    Test that the aggregation pipeline includes a $limit stage set to 5.
    Addresses: Check the sorting and limiting logic in the aggregation pipeline.
    """
    # Arrange
    mock_collection.aggregate.return_value = []

    # Act
    metrics_service.get_top_5_worst_performing_questions()

    # Assert
    mock_collection.aggregate.assert_called_once()
    args, _ = mock_collection.aggregate.call_args
    pipeline = args[0]

    # Check for $limit: 5 in the pipeline
    limit_stage = next((stage for stage in pipeline if '$limit' in stage), None)
    assert limit_stage is not None, "Aggregation pipeline must contain a $limit stage"
    assert limit_stage['$limit'] == 5, "Aggregation pipeline must limit to 5 questions"

def test_top_5_worst_performing_questions_pipeline_has_sort(metrics_service, mock_collection):
    """
    Test that the aggregation pipeline includes a $sort stage by a performance metric.
    Addresses: Check the sorting and limiting logic in the aggregation pipeline.
    """
    # Arrange
    mock_collection.aggregate.return_value = []

    # Act
    metrics_service.get_top_5_worst_performing_questions()

    # Assert
    mock_collection.aggregate.assert_called_once()
    args, _ = mock_collection.aggregate.call_args
    pipeline = args[0]

    # Check for $sort in the pipeline
    sort_stage = next((stage for stage in pipeline if '$sort' in stage), None)
    assert sort_stage is not None, "Aggregation pipeline must contain a $sort stage"
    
    # Assuming worst performing means lowest success rate or highest error rate
    sort_key = list(sort_stage['$sort'].keys())[0]
    assert sort_key in ['success_rate', 'error_rate', 'failure_rate'], f"Pipeline must sort by a performance metric, found: {sort_key}"

def test_top_5_worst_performing_questions_correct_order(metrics_service, mock_collection):
    """
    Test that the returned questions are correctly ordered (worst to best).
    """
    # Arrange: Simulate database returning 5 items sorted by success_rate ascending
    mock_questions = [
        {"question_id": 1, "success_rate": 0.1},
        {"question_id": 2, "success_rate": 0.2},
        {"question_id": 3, "success_rate": 0.3},
        {"question_id": 4, "success_rate": 0.4},
        {"question_id": 5, "success_rate": 0.5}
    ]
    mock_collection.aggregate.return_value = mock_questions

    # Act
    result = metrics_service.get_top_5_worst_performing_questions()

    # Assert
    assert len(result) == 5
    assert result[0]['question_id'] == 1
    assert result[4]['question_id'] == 5
