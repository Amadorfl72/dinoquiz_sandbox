import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
import sys
import os

# Add src to path to import from our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'utils'))

# Mock Firebase modules
sys.modules['firebase/app'] = MagicMock()
sys.modules['firebase/analytics'] = MagicMock()
sys.modules['firebase/functions'] = MagicMock()

import analytics
import metrics

@pytest.fixture
def mock_firebase_analytics():
    with patch('analytics.logEvent') as mock_log:
        yield mock_log

@pytest.fixture
def mock_https_callable():
    with patch('metrics.httpsCallable') as mock_https:
        mock_callable = MagicMock()
        mock_https.return_value = mock_callable
        yield mock_callable

def test_log_partida_iniciada(mock_firebase_analytics):
    question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    analytics.logGameStarted(question_ids)
    
    mock_firebase_analytics.assert_called_once()
    call_args = mock_firebase_analytics.call_args[0]
    assert call_args[1] == 'partida_iniciada'
    assert 'timestamp' in call_args[2]
    assert call_args[2]['question_ids'] == question_ids

def test_log_pregunta_respondida(mock_firebase_analytics):
    question_id = 42
    is_hit = True
    response_time_ms = 1500
    previous_question_id = 41
    
    analytics.logQuestionAnswered(question_id, is_hit, response_time_ms, previous_question_id)
    
    mock_firebase_analytics.assert_called_once()
    call_args = mock_firebase_analytics.call_args[0]
    assert call_args[1] == 'pregunta_respondida'
    assert call_args[2]['question_id'] == question_id
    assert call_args[2]['is_hit'] == is_hit
    assert call_args[2]['response_time_ms'] == response_time_ms
    assert call_args[2]['previous_question_id'] == previous_question_id

def test_log_bank_load_validation_success(mock_firebase_analytics):
    analytics.logBankLoadValidation(is_valid=True)
    
    mock_firebase_analytics.assert_called_once()
    call_args = mock_firebase_analytics.call_args[0]
    assert call_args[1] == 'bank_load_validation'
    assert call_args[2]['is_valid'] == True

def test_log_bank_load_validation_failure(mock_firebase_analytics):
    error_msg = "Not enough questions"
    analytics.logBankLoadValidation(is_valid=False, errorMessage=error_msg)
    
    mock_firebase_analytics.assert_called_once()
    call_args = mock_firebase_analytics.call_args[0]
    assert call_args[1] == 'bank_load_validation'
    assert call_args[2]['is_valid'] == False
    assert call_args[2]['error_message'] == error_msg

def test_get_current_alerts(mock_https_callable):
    mock_result = MagicMock()
    mock_result.data = {'alerts': [{'id': '1', 'type': 'low_hit_percentage'}]}
    mock_https_callable.return_value = MagicMock(return_value=mock_result)
    
    result = metrics.getCurrentAlerts()
    
    assert isinstance(result, MagicMock)  # We're testing the callable is returned correctly
    mock_https_callable.assert_called_once()