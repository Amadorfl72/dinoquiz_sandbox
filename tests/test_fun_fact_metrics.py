import pytest
from unittest.mock import patch, MagicMock

# Assuming the fix is implemented in app.services.fun_fact_service
from app.services.fun_fact_service import view_fun_fact

def test_fun_fact_viewed_metric_incremented():
    """Test that fun_fact_viewed metric is incremented and logged when a fun fact is viewed."""
    with patch('app.services.fun_fact_service.metrics_client') as mock_metrics, \
         patch('app.services.fun_fact_service.logger') as mock_logger, \
         patch('app.services.fun_fact_service.get_fun_fact_from_db', return_value={'id': 42, 'fact': 'Cats sleep 70% of their lives.'}):
        
        view_fun_fact(user_id=1, fun_fact_id=42)
        
        # Verify metric was incremented
        mock_metrics.increment.assert_called_once_with('fun_fact_viewed', 1)
        
        # Verify logging occurred
        mock_logger.info.assert_called_once_with(
            'Fun fact viewed', 
            extra={'user_id': 1, 'fun_fact_id': 42}
        )

def test_fun_fact_viewed_metric_not_incremented_on_failure():
    """Test that metric is not incremented if viewing fails."""
    with patch('app.services.fun_fact_service.get_fun_fact_from_db', side_effect=Exception('DB Error')), \
         patch('app.services.fun_fact_service.metrics_client') as mock_metrics, \
         patch('app.services.fun_fact_service.logger') as mock_logger:
        
        with pytest.raises(Exception):
            view_fun_fact(user_id=1, fun_fact_id=42)
            
        mock_metrics.increment.assert_not_called()
        mock_logger.error.assert_called_once_with(
            'Failed to view fun fact',
            extra={'user_id': 1, 'fun_fact_id': 42}
        )
