import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in app.metrics.fun_facts
from app.metrics.fun_facts import record_fun_fact_viewed

@pytest.fixture
def mock_logger():
    with patch('app.metrics.fun_facts.logger') as mock:
        yield mock

@pytest.fixture
def mock_metrics():
    with patch('app.metrics.fun_facts.metrics_client') as mock:
        yield mock

def test_record_fun_fact_viewed_logs_and_increments_metric(mock_logger, mock_metrics):
    user_id = "user-123"
    fun_fact_id = "fact-456"
    
    record_fun_fact_viewed(user_id=user_id, fun_fact_id=fun_fact_id)
    
    # Verify metric increment
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')
    
    # Verify logging
    mock_logger.info.assert_called_once()
    log_call_args = mock_logger.info.call_args
    # Assuming structured logging
    log_data = log_call_args.kwargs
    assert log_data.get('event') == 'fun_fact_viewed'
    assert log_data.get('user_id') == user_id
    assert log_data.get('fun_fact_id') == fun_fact_id

def test_record_fun_fact_viewed_handles_missing_user_id(mock_logger, mock_metrics):
    fun_fact_id = "fact-456"
    
    record_fun_fact_viewed(user_id=None, fun_fact_id=fun_fact_id)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')
    mock_logger.info.assert_called_once()
    log_data = mock_logger.info.call_args.kwargs
    assert log_data.get('event') == 'fun_fact_viewed'
    assert log_data.get('user_id') is None
    assert log_data.get('fun_fact_id') == fun_fact_id

def test_record_fun_fact_viewed_handles_missing_fun_fact_id(mock_logger, mock_metrics):
    user_id = "user-123"
    
    record_fun_fact_viewed(user_id=user_id, fun_fact_id=None)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed')
    mock_logger.info.assert_called_once()
    log_data = mock_logger.info.call_args.kwargs
    assert log_data.get('event') == 'fun_fact_viewed'
    assert log_data.get('user_id') == user_id
    assert log_data.get('fun_fact_id') is None

def test_record_fun_fact_viewed_metric_tags(mock_logger, mock_metrics):
    user_id = "user-123"
    fun_fact_id = "fact-456"
    
    record_fun_fact_viewed(user_id=user_id, fun_fact_id=fun_fact_id)
    
    # If the metric implementation supports tags, ensure they are passed correctly
    # This depends on the specific metrics client used, but we check for a common pattern
    assert mock_metrics.increment.called
    call_args = mock_metrics.increment.call_args
    assert call_args.args[0] == 'fun_fact_viewed' or call_args.kwargs.get('metric') == 'fun_fact_viewed'