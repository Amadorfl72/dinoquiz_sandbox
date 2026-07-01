import pytest
from unittest.mock import patch, MagicMock
import logging

# Assuming the implementation is in app.services.fun_facts
from app.services.fun_facts import view_fun_fact

@pytest.fixture
def mock_metrics():
    with patch('app.services.fun_facts.metrics') as mock:
        yield mock

@pytest.fixture
def mock_logger():
    with patch('app.services.fun_facts.logger') as mock:
        yield mock

@pytest.fixture
def mock_fact_repository():
    with patch('app.services.fun_facts.FactRepository') as mock:
        instance = mock.return_value
        instance.get_fact.return_value = {'id': 'fact456', 'text': 'A fun fact'}
        yield instance

def test_fun_fact_viewed_metric_incremented(mock_metrics, mock_logger, mock_fact_repository):
    """Test that the fun_fact_viewed metric is incremented when a fact is viewed."""
    user_id = "user123"
    fact_id = "fact456"
    
    view_fun_fact(user_id, fact_id)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')

def test_fun_fact_viewed_logging(mock_metrics, mock_logger, mock_fact_repository):
    """Test that the fun fact viewed event is logged correctly."""
    user_id = "user123"
    fact_id = "fact456"
    
    view_fun_fact(user_id, fact_id)
    
    mock_logger.info.assert_called_once()
    log_message = mock_logger.info.call_args[0][0]
    assert "fact456" in log_message
    assert "user123" in log_message

def test_fun_fact_viewed_metric_not_incremented_if_not_found(mock_metrics, mock_logger, mock_fact_repository):
    """Test that the metric is not incremented if the fact does not exist."""
    user_id = "user123"
    fact_id = "non_existent_fact"
    mock_fact_repository.get_fact.return_value = None
    
    result = view_fun_fact(user_id, fact_id)
    
    assert result is False
    mock_metrics.increment.assert_not_called()
    mock_logger.info.assert_not_called()
