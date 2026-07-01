import pytest
from unittest.mock import patch, MagicMock
import observability

def test_log_partida_iniciada():
    with patch('observability.logger') as mock_logger:
        timestamp = "2023-10-01T12:00:00Z"
        question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        observability.log_partida_iniciada(timestamp, question_ids)
        mock_logger.info.assert_called_once_with(
            'partida_iniciada', extra={'timestamp': timestamp, 'question_ids': question_ids}
        )

def test_log_pregunta_respondida():
    with patch('observability.logger') as mock_logger:
        question_id = 1
        hit = True
        time_taken = 5.2
        observability.log_pregunta_respondida(question_id, hit, time_taken)
        mock_logger.info.assert_called_once_with(
            'pregunta_respondida', extra={'id': question_id, 'hit': hit, 'time': time_taken}
        )

def test_log_bank_load_validation_success():
    with patch('observability.logger') as mock_logger:
        observability.log_bank_load_validation(success=True, count=100)
        mock_logger.info.assert_called_once_with(
            'bank_load_validation', extra={'success': True, 'count': 100}
        )

def test_log_bank_load_validation_failure():
    with patch('observability.logger') as mock_logger:
        observability.log_bank_load_validation(success=False, error="File not found")
        mock_logger.error.assert_called_once_with(
            'bank_load_validation', extra={'success': False, 'error': "File not found"}
        )

def test_metrics_hit_percentage():
    with patch('observability.metrics_client') as mock_metrics:
        observability.update_hit_percentage(question_id=1, hits=10, attempts=20)
        mock_metrics.gauge.assert_called_with('question_hit_percentage', 50.0, {'question_id': 1})

def test_metrics_drop_off():
    with patch('observability.metrics_client') as mock_metrics:
        observability.update_drop_off(question_id=1, drop_off_count=5, total_count=100)
        mock_metrics.gauge.assert_called_with('question_drop_off', 5.0, {'question_id': 1})

def test_alert_drop_off_triggered():
    with patch('observability.alert_manager') as mock_alert:
        observability.check_drop_off_alert(question_id=1, drop_off_rate=0.06)
        mock_alert.trigger.assert_called_with('HighDropOffAlert', 'Drop-off for question 1 is > 5%')

def test_alert_drop_off_not_triggered():
    with patch('observability.alert_manager') as mock_alert:
        observability.check_drop_off_alert(question_id=1, drop_off_rate=0.04)
        mock_alert.trigger.assert_not_called()

def test_alert_hit_percentage_triggered():
    with patch('observability.alert_manager') as mock_alert:
        observability.check_hit_percentage_alert(question_id=1, hit_rate=0.35)
        mock_alert.trigger.assert_called_with('LowHitRateAlert', 'Hit rate for question 1 is < 40%')

def test_alert_hit_percentage_not_triggered():
    with patch('observability.alert_manager') as mock_alert:
        observability.check_hit_percentage_alert(question_id=1, hit_rate=0.45)
        mock_alert.trigger.assert_not_called()
