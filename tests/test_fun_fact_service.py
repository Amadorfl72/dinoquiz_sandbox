import pytest
from unittest.mock import MagicMock

from app.services.fun_fact_service import FunFactService

def test_fun_fact_viewed_metric_incremented():
    metrics_client = MagicMock()
    logger = MagicMock()
    service = FunFactService(metrics_client, logger)

    service.view_fun_fact(user_id="user_123", fact_id="fact_456")

    metrics_client.increment.assert_called_once_with("fun_fact_viewed")

def test_fun_fact_viewed_logging():
    metrics_client = MagicMock()
    logger = MagicMock()
    service = FunFactService(metrics_client, logger)

    service.view_fun_fact(user_id="user_123", fact_id="fact_456")

    logger.info.assert_called_once()
    log_message = logger.info.call_args[0][0]
    assert "user_123" in log_message
    assert "fact_456" in log_message

def test_fun_fact_viewed_no_metric_on_error():
    metrics_client = MagicMock()
    logger = MagicMock()
    service = FunFactService(metrics_client, logger)
    
    with pytest.raises(ValueError):
        service.view_fun_fact(user_id="user_123", fact_id=None)
        
    metrics_client.increment.assert_not_called()
