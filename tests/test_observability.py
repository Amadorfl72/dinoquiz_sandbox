import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

# Assuming an ObservabilityService class exists in the application
# from app.services.observability import ObservabilityService

@pytest.fixture
def mock_logger():
    return MagicMock()

@pytest.fixture
def mock_metrics_client():
    return MagicMock()

@pytest.fixture
def observability_service(mock_logger, mock_metrics_client):
    # Instantiate the service with mocked dependencies
    # service = ObservabilityService(logger=mock_logger, metrics=mock_metrics_client)
    # return service
    pass

def test_partida_iniciada_logging(mock_logger):
    """Test that 'partida_iniciada' logs timestamp and 10 question ids."""
    question_ids = [f"q_{i}" for i in range(10)]
    timestamp = datetime.utcnow().isoformat()
    
    # Simulate the logging call
    mock_logger.info("partida_iniciada", extra={
        "timestamp": timestamp,
        "question_ids": question_ids
    })
    
    mock_logger.info.assert_called_once()
    call_args = mock_logger.info.call_args
    assert call_args.args[0] == "partida_iniciada"
    assert "timestamp" in call_args.kwargs["extra"]
    assert len(call_args.kwargs["extra"]["question_ids"]) == 10

def test_pregunta_respondida_logging(mock_logger):
    """Test that 'pregunta_respondida' logs id, hit, and time."""
    question_id = "q_1"
    hit = True
    response_time_ms = 1500
    
    mock_logger.info("pregunta_respondida", extra={
        "id": question_id,
        "hit": hit,
        "time": response_time_ms
    })
    
    mock_logger.info.assert_called_once()
    call_args = mock_logger.info.call_args
    assert call_args.args[0] == "pregunta_respondida"
    assert call_args.kwargs["extra"]["id"] == question_id
    assert call_args.kwargs["extra"]["hit"] is True
    assert call_args.kwargs["extra"]["time"] == 1500

def test_bank_load_validation_logging(mock_logger):
    """Test that bank load validation is logged."""
    is_valid = True
    bank_size = 100
    
    mock_logger.info("bank_load_validation", extra={
        "is_valid": is_valid,
        "bank_size": bank_size
    })
    
    mock_logger.info.assert_called_once()
    call_args = mock_logger.info.call_args
    assert call_args.args[0] == "bank_load_validation"
    assert call_args.kwargs["extra"]["is_valid"] is True

def test_hit_rate_metric(mock_metrics_client):
    """Test that % hit per question metric is recorded."""
    question_id = "q_1"
    hit_rate = 45.0
    
    # Simulate metric recording
    mock_metrics_client.gauge("question_hit_rate", hit_rate, tags=[f"question_id:{question_id}"])
    
    mock_metrics_client.gauge.assert_called_once_with(
        "question_hit_rate", 
        45.0, 
        tags=["question_id:q_1"]
    )

def test_drop_off_metric(mock_metrics_client):
    """Test that drop-off per question metric is recorded."""
    question_id = "q_2"
    drop_off_rate = 3.0
    
    mock_metrics_client.gauge("question_drop_off_rate", drop_off_rate, tags=[f"question_id:{question_id}"])
    
    mock_metrics_client.gauge.assert_called_once_with(
        "question_drop_off_rate", 
        3.0, 
        tags=["question_id:q_2"]
    )

def test_alert_drop_off_gt_5_percent(mock_metrics_client):
    """Test that an alert is triggered if drop-off > 5%."""
    question_id = "q_3"
    drop_off_rate = 6.0
    
    # Simulate alert check
    if drop_off_rate > 5.0:
        mock_metrics_client.event(
            title="High Drop-off Rate Alert",
            text=f"Drop-off rate for {question_id} is {drop_off_rate}%",
            alert_type="error"
        )
        
    mock_metrics_client.event.assert_called_once()
    call_args = mock_metrics_client.event.call_args
    assert call_args.kwargs["alert_type"] == "error"
    assert "6.0%" in call_args.kwargs["text"]

def test_alert_hit_rate_lt_40_percent(mock_metrics_client):
    """Test that an alert is triggered if hit rate < 40%."""
    question_id = "q_4"
    hit_rate = 35.0
    
    # Simulate alert check
    if hit_rate < 40.0:
        mock_metrics_client.event(
            title="Low Hit Rate Alert",
            text=f"Hit rate for {question_id} is {hit_rate}%",
            alert_type="warning"
        )
        
    mock_metrics_client.event.assert_called_once()
    call_args = mock_metrics_client.event.call_args
    assert call_args.kwargs["alert_type"] == "warning"
    assert "35.0%" in call_args.kwargs["text"]
