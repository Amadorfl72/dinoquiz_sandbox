import pytest
from unittest.mock import MagicMock
from app.services.fun_fact_service import FunFactService

@pytest.fixture
def mock_logger():
    return MagicMock()

@pytest.fixture
def mock_metrics():
    return MagicMock()

@pytest.fixture
def service(mock_logger, mock_metrics):
    return FunFactService(logger=mock_logger, metrics=mock_metrics)

def test_fun_fact_viewed_logs_and_increments_metric(service, mock_logger, mock_metrics):
    user_id = "user_123"
    fact_id = "fact_456"
    
    service.view_fun_fact(user_id, fact_id)
    
    mock_metrics.increment.assert_called_once_with("fun_fact_viewed", {"user_id": user_id, "fact_id": fact_id})
    mock_logger.info.assert_called_once_with("Fun fact viewed", extra={"user_id": user_id, "fact_id": fact_id})

def test_fun_fact_viewed_invalid_fact_id(service, mock_logger, mock_metrics):
    user_id = "user_123"
    fact_id = ""
    
    with pytest.raises(ValueError, match="Invalid fact_id"):
        service.view_fun_fact(user_id, fact_id)
        
    mock_metrics.increment.assert_not_called()
    mock_logger.info.assert_not_called()

def test_fun_fact_viewed_invalid_user_id(service, mock_logger, mock_metrics):
    user_id = ""
    fact_id = "fact_456"
    
    with pytest.raises(ValueError, match="Invalid user_id"):
        service.view_fun_fact(user_id, fact_id)
        
    mock_metrics.increment.assert_not_called()
    mock_logger.info.assert_not_called()

def test_fun_fact_viewed_missing_user_id(service, mock_logger, mock_metrics):
    user_id = None
    fact_id = "fact_456"
    
    with pytest.raises(ValueError, match="Invalid user_id"):
        service.view_fun_fact(user_id, fact_id)
        
    mock_metrics.increment.assert_not_called()
    mock_logger.info.assert_not_called()

def test_fun_fact_viewed_missing_fact_id(service, mock_logger, mock_metrics):
    user_id = "user_123"
    fact_id = None
    
    with pytest.raises(ValueError, match="Invalid fact_id"):
        service.view_fun_fact(user_id, fact_id)
        
    mock_metrics.increment.assert_not_called()
    mock_logger.info.assert_not_called()
