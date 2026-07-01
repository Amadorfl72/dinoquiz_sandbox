import pytest
from unittest.mock import patch, MagicMock
import json

# Assuming the implementation is in a module named trivia_observability
import trivia_observability as obs

def test_log_partida_iniciada():
    timestamp = "2023-10-01T12:00:00Z"
    question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    with patch.object(obs.logger, 'info') as mock_info:
        obs.log_partida_iniciada(timestamp, question_ids)
        mock_info.assert_called_once()
        log_data = mock_info.call_args[0][0]
        
        assert "partida_iniciada" in log_data
        assert timestamp in log_data
        for qid in question_ids:
            assert str(qid) in log_data

def test_log_pregunta_respondida():
    question_id = 42
    hit = True
    response_time = 5.5
    
    with patch.object(obs.logger, 'info') as mock_info:
        obs.log_pregunta_respondida(question_id, hit, response_time)
        mock_info.assert_called_once()
        log_data = mock_info.call_args[0][0]
        
        assert "pregunta_respondida" in log_data
        assert str(question_id) in log_data
        assert "hit" in log_data
        assert str(response_time) in log_data

def test_log_bank_load_validation_success():
    is_valid = True
    details = "Bank loaded successfully with 100 questions"
    
    with patch.object(obs.logger, 'info') as mock_info:
        obs.log_bank_load_validation(is_valid, details)
        mock_info.assert_called_once()
        log_data = mock_info.call_args[0][0]
        
        assert "bank_load_validation" in log_data
        assert "success" in log_data.lower()

def test_log_bank_load_validation_failure():
    is_valid = False
    details = "Missing 2 questions"
    
    with patch.object(obs.logger, 'error') as mock_error:
        obs.log_bank_load_validation(is_valid, details)
        mock_error.assert_called_once()
        log_data = mock_error.call_args[0][0]
        
        assert "bank_load_validation" in log_data
        assert "Missing 2 questions" in log_data

def test_calculate_metrics():
    stats = {
        1: {'presented': 100, 'answered': 95, 'hits': 30},
        2: {'presented': 100, 'answered': 100, 'hits': 50}
    }
    metrics = obs.calculate_metrics(stats)
    
    assert metrics[1]['hit_percentage'] == 30.0
    assert metrics[1]['drop_off_percentage'] == 5.0
    assert metrics[2]['hit_percentage'] == 50.0
    assert metrics[2]['drop_off_percentage'] == 0.0

def test_alerts_triggered_drop_off():
    metrics = {
        1: {'hit_percentage': 80.0, 'drop_off_percentage': 10.0} # >5% drop-off
    }
    alerts = obs.check_alerts(metrics)
    assert 1 in alerts
    assert "drop_off" in alerts[1]

def test_alerts_triggered_hit_rate():
    metrics = {
        2: {'hit_percentage': 30.0, 'drop_off_percentage': 0.0} # <40% hit
    }
    alerts = obs.check_alerts(metrics)
    assert 2 in alerts
    assert "hit_rate" in alerts[2]

def test_alerts_not_triggered():
    metrics = {
        3: {'hit_percentage': 90.0, 'drop_off_percentage': 2.0} # No alert
    }
    alerts = obs.check_alerts(metrics)
    assert 3 not in alerts

def test_alerts_boundary_conditions():
    metrics = {
        4: {'hit_percentage': 40.0, 'drop_off_percentage': 5.0} # Exactly on boundary, no alert
    }
    alerts = obs.check_alerts(metrics)
    assert 4 not in alerts
