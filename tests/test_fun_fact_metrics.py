import pytest
from unittest.mock import patch, MagicMock

# Assuming the implementation is in app.services.fun_fact_service
from app.services.fun_fact_service import view_fun_fact

@pytest.fixture
def mock_metrics():
    with patch('app.services.fun_fact_service.metrics_client') as mock:
        yield mock

@pytest.fixture
def mock_logger():
    with patch('app.services.fun_fact_service.logger') as mock:
        yield mock

def test_fun_fact_viewed_metric_incremented(mock_metrics, mock_logger):
    fun_fact_id = "123"
    user_id = "user_456"
    
    view_fun_fact(fun_fact_id=fun_fact_id, user_id=user_id)
    
    mock_metrics.increment.assert_called_once_with('fun_fact_viewed', tags={'fun_fact_id': fun_fact_id, 'user_id': user_id})

def test_fun_fact_viewed_logging(mock_metrics, mock_logger):
    fun_fact_id = "123"
    user_id = "user_456"
    
    view_fun_fact(fun_fact_id=fun_fact_id, user_id=user_id)
    
    mock_logger.info.assert_called_once()
    log_call_args = mock_logger.info.call_args[0][0]
    assert "fun_fact_viewed" in log_call_args
    assert fun_fact_id in log_call_args
    assert user_id in log_call_args

def test_fun_fact_viewed_metric_not_incremented_on_error(mock_metrics, mock_logger):
    fun_fact_id = "123"
    user_id = "user_456"
    
    with patch('app.services.fun_fact_service.get_fun_fact', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            view_fun_fact(fun_fact_id=fun_fact_id, user_id=user_id)
    
    mock_metrics.increment.assert_not_called()
    mock_logger.error.assert_called_once()