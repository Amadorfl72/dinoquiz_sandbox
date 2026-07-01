import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
import observability

@pytest.fixture
def mock_logger():
    with patch('observability.logger') as mock_log:
        yield mock_log

@pytest.fixture
def mock_metrics():
    with patch('observability.metrics_client') as mock_m:
        yield mock_m

@pytest.fixture
def mock_alerts():
    with patch('observability.alerts_client') as mock_a:
        yield mock_a

def test_log_partida_iniciada(mock_logger):
    question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    timestamp = datetime.utcnow().isoformat()
    
    observability.log_partida_iniciada(timestamp, question_ids)
    
    mock_logger.info.assert_called_once()
    log_data = mock_logger.info.call_args[0][0]
    assert "partida_iniciada" in log_data
    assert timestamp in log_data
    assert all(str(qid) in log_data for qid in question_ids)

def test_log_pregunta_respondida(mock_logger):
    question_id = 42
    hit = True
    time_taken = 5.2
    
    observability.log_pregunta_respondida(question_id, hit, time_taken)
    
    mock_logger.info.assert_called_once()
    log_data = mock_logger.info.call_args[0][0]
    assert "pregunta_respondida" in log_data
    assert str(question_id) in log_data
    assert "hit: True" in log_data or "hit=True" in log_data
    assert str(time_taken) in log_data

def test_log_bank_load_validation_success(mock_logger):
    observability.log_bank_load_validation(is_valid=True, question_count=100)
    
    mock_logger.info.assert_called_once()
    log_data = mock_logger.info.call_args[0][0]
    assert "bank_load_validation" in log_data
    assert "success" in log_data.lower()

def test_log_bank_load_validation_failure(mock_logger):
    observability.log_bank_load_validation(is_valid=False, question_count=0)
    
    mock_logger.error.assert_called_once()
    log_data = mock_logger.error.call_args[0][0]
    assert "bank_load_validation" in log_data
    assert "failed" in log_data.lower()

def test_metrics_hit_rate(mock_metrics):
    observability.update_hit_rate_metric(question_id=1, hit_rate=0.5)
    mock_metrics.gauge.assert_called_with('question_hit_rate', 0.5, tags=['question_id:1'])

def test_metrics_drop_off(mock_metrics):
    observability.update_drop_off_metric(question_id=1, drop_off_rate=0.1)
    mock_metrics.gauge.assert_called_with('question_drop_off', 0.1, tags=['question_id:1'])

def test_alert_drop_off_triggered(mock_alerts):
    observability.check_drop_off_alert(question_id=1, drop_off_rate=0.06)
    mock_alerts.trigger.assert_called_once()
    alert_args = mock_alerts.trigger.call_args[0]
    assert "drop_off" in alert_args[0]
    assert "question_id:1" in alert_args[1]

def test_alert_drop_off_not_triggered(mock_alerts):
    observability.check_drop_off_alert(question_id=1, drop_off_rate=0.04)
    mock_alerts.trigger.assert_not_called()

def test_alert_hit_rate_triggered(mock_alerts):
    observability.check_hit_rate_alert(question_id=1, hit_rate=0.35)
    mock_alerts.trigger.assert_called_once()
    alert_args = mock_alerts.trigger.call_args[0]
    assert "hit_rate" in alert_args[0]
    assert "question_id:1" in alert_args[1]

def test_alert_hit_rate_not_triggered(mock_alerts):
    observability.check_hit_rate_alert(question_id=1, hit_rate=0.45)
    mock_alerts.trigger.assert_not_called()
