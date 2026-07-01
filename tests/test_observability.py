import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
import observability

@pytest.fixture
def reset_metrics():
    observability.metrics_store = {
        'questions': {},
        'drop_offs': {}
    }
    yield
    observability.metrics_store = {
        'questions': {},
        'drop_offs': {}
    }

def test_log_partida_iniciada(caplog):
    timestamp = datetime.utcnow().isoformat()
    ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    observability.log_partida_iniciada(timestamp, ids)
    
    assert any('partida_iniciada' in record.message for record in caplog.records)
    assert any(timestamp in record.message for record in caplog.records)
    for q_id in ids:
        assert any(str(q_id) in record.message for record in caplog.records)

def test_log_pregunta_respondida(caplog):
    question_id = 42
    hit = True
    time_taken = 5.2
    
    observability.log_pregunta_respondida(question_id, hit, time_taken)
    
    assert any('pregunta_respondida' in record.message for record in caplog.records)
    assert any(str(question_id) in record.message for record in caplog.records)
    assert any(str(hit) in record.message for record in caplog.records)
    assert any(str(time_taken) in record.message for record in caplog.records)

def test_log_bank_load_validation(caplog):
    status = 'success'
    details = 'Loaded 100 questions'
    
    observability.log_bank_load_validation(status, details)
    
    assert any('bank_load_validation' in record.message for record in caplog.records)
    assert any(status in record.message for record in caplog.records)
    assert any(details in record.message for record in caplog.records)

def test_metrics_hit_percentage(reset_metrics):
    observability.record_question_metric(1, True)
    observability.record_question_metric(1, True)
    observability.record_question_metric(1, False)
    
    hit_rate = observability.get_hit_rate(1)
    assert hit_rate == pytest.approx(66.66, rel=1e-2)

def test_metrics_drop_off(reset_metrics):
    observability.record_drop_off(1, total_started=100, dropped=6)
    
    drop_off_rate = observability.get_drop_off_rate(1)
    assert drop_off_rate == 6.0

def test_alert_high_drop_off(reset_metrics):
    observability.record_drop_off(1, total_started=100, dropped=6) # 6% drop-off
    
    alerts = observability.check_alerts()
    assert any(alert['type'] == 'high_drop_off' and alert['question_id'] == 1 for alert in alerts)

def test_alert_low_hit_rate(reset_metrics):
    observability.record_question_metric(2, True)
    observability.record_question_metric(2, False)
    observability.record_question_metric(2, False)
    observability.record_question_metric(2, False) # 25% hit rate
    
    alerts = observability.check_alerts()
    assert any(alert['type'] == 'low_hit_rate' and alert['question_id'] == 2 for alert in alerts)

def test_no_alert_when_metrics_normal(reset_metrics):
    observability.record_question_metric(3, True)
    observability.record_question_metric(3, True)
    observability.record_question_metric(3, False) # 66% hit rate
    observability.record_drop_off(3, total_started=100, dropped=2) # 2% drop-off
    
    alerts = observability.check_alerts()
    assert len(alerts) == 0
