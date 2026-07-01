import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from app.observability import log_partida_iniciada, log_pregunta_respondida, log_bank_load_validation, record_metrics, check_alerts

@patch('app.observability.logger')
def test_log_partida_iniciada(mock_logger):
    timestamp = datetime.now().isoformat()
    question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    log_partida_iniciada(timestamp, question_ids)
    mock_logger.info.assert_called_once_with('partida_iniciada', extra={'timestamp': timestamp, 'question_ids': question_ids})

@patch('app.observability.logger')
def test_log_pregunta_respondida(mock_logger):
    question_id = 5
    hit = True
    time_spent = 12.5
    log_pregunta_respondida(question_id, hit, time_spent)
    mock_logger.info.assert_called_once_with('pregunta_respondida', extra={'id': question_id, 'hit': hit, 'time': time_spent})

@patch('app.observability.logger')
def test_log_bank_load_validation_success(mock_logger):
    log_bank_load_validation(is_valid=True, details={'count': 10})
    mock_logger.info.assert_called_once_with('bank_load_validation', extra={'is_valid': True, 'details': {'count': 10}})

@patch('app.observability.logger')
def test_log_bank_load_validation_failure(mock_logger):
    log_bank_load_validation(is_valid=False, details={'error': 'File not found'})
    mock_logger.error.assert_called_once_with('bank_load_validation', extra={'is_valid': False, 'details': {'error': 'File not found'}})

@patch('app.observability.metrics_client')
def test_record_metrics_hit(mock_metrics):
    record_metrics(question_id=1, hit=True)
    mock_metrics.increment.assert_any_call('question_1_attempts')
    mock_metrics.increment.assert_any_call('question_1_hits')

@patch('app.observability.metrics_client')
def test_record_metrics_miss(mock_metrics):
    record_metrics(question_id=2, hit=False)
    mock_metrics.increment.assert_any_call('question_2_attempts')
    mock_metrics.increment.assert_any_call('question_2_misses')

@patch('app.observability.metrics_client')
def test_check_alerts_high_dropoff(mock_metrics):
    # Simulate >5% drop-off
    mock_metrics.get_dropoff_rate.return_value = 0.06
    mock_metrics.get_hit_rate.return_value = 0.80
    check_alerts(question_id=1)
    mock_metrics.trigger_alert.assert_called_once_with('High drop-off rate for question 1: 6.0%')

@patch('app.observability.metrics_client')
def test_check_alerts_low_hit_rate(mock_metrics):
    # Simulate <40% hit rate
    mock_metrics.get_dropoff_rate.return_value = 0.02
    mock_metrics.get_hit_rate.return_value = 0.35
    check_alerts(question_id=2)
    mock_metrics.trigger_alert.assert_called_once_with('Low hit rate for question 2: 35.0%')

@patch('app.observability.metrics_client')
def test_check_alerts_no_alert(mock_metrics):
    mock_metrics.get_dropoff_rate.return_value = 0.03
    mock_metrics.get_hit_rate.return_value = 0.50
    check_alerts(question_id=3)
    mock_metrics.trigger_alert.assert_not_called()
