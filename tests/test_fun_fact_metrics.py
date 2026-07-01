import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_analytics():
    return MagicMock()

@pytest.fixture
def fun_fact_manager(mock_analytics):
    from fun_fact_manager import FunFactManager
    return FunFactManager(analytics=mock_analytics)

def test_fun_fact_viewed_metric_logged(fun_fact_manager, mock_analytics):
    fact_id = "123"
    fact_text = "Cats sleep 70% of their lives."
    
    fun_fact_manager.view_fun_fact(fact_id, fact_text)
    
    mock_analytics.log_metric.assert_called_once_with(
        'fun_fact_viewed',
        {'fact_id': fact_id, 'fact_text': fact_text}
    )

def test_fun_fact_viewed_logging(fun_fact_manager, mock_analytics):
    fact_id = "456"
    fact_text = "Bananas are berries, but strawberries are not."
    
    fun_fact_manager.view_fun_fact(fact_id, fact_text)
    
    mock_analytics.log_event.assert_called_once_with(
        'fun_fact_viewed',
        {'fact_id': fact_id, 'fact_text': fact_text}
    )

def test_fun_fact_viewed_metric_not_logged_on_error(fun_fact_manager, mock_analytics):
    fact_id = None
    fact_text = ""
    
    with pytest.raises(ValueError):
        fun_fact_manager.view_fun_fact(fact_id, fact_text)
    
    mock_analytics.log_metric.assert_not_called()
    mock_analytics.log_event.assert_not_called()
