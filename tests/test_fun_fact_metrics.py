import pytest
from unittest.mock import patch, MagicMock
import logging
from app.services.fun_fact_service import record_fun_fact_viewed

@pytest.fixture
def mock_metrics():
    with patch('app.services.fun_fact_service.metrics_client') as mock:
        yield mock

@pytest.fixture
def mock_logger():
    with patch('app.services.fun_fact_service.logger') as mock:
        yield mock

def test_record_fun_fact_viewed_increments_metric(mock_metrics, mock_logger):
    user_id = "user123"
    fun_fact_id = "fact456"
    
    record_fun_fact_viewed(user_id, fun_fact_id)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed', tags={'fun_fact_id': fun_fact_id, 'user_id': user_id})

def test_record_fun_fact_viewed_logs_event(mock_metrics, mock_logger):
    user_id = "user123"
    fun_fact_id = "fact456"
    
    record_fun_fact_viewed(user_id, fun_fact_id)
    
    mock_logger.info.assert_called_once()
    log_call_args = mock_logger.info.call_args[0][0]
    assert "fun_fact_viewed" in log_call_args
    assert fun_fact_id in log_call_args
    assert user_id in log_call_args

def test_record_fun_fact_viewed_handles_missing_user(mock_metrics, mock_logger):
    fun_fact_id = "fact456"
    
    record_fun_fact_viewed(None, fun_fact_id)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed', tags={'fun_fact_id': fun_fact_id, 'user_id': 'anonymous'})
    mock_logger.info.assert_called_once()
