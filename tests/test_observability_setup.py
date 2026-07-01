import pytest
from unittest.mock import MagicMock
from observability_setup import ObservabilityManager

@pytest.fixture
def mock_client():
    return MagicMock()

@pytest.fixture
def manager(mock_client):
    return ObservabilityManager(client=mock_client)

def test_setup_tti_dashboard(manager, mock_client):
    """Test that the TTI dashboard is configured with the correct metrics."""
    manager.setup_tti_dashboard()
    
    mock_client.create_dashboard.assert_called_once()
    call_args = mock_client.create_dashboard.call_args[1]
    
    assert call_args['title'] == "TTI and App Open Metrics"
    
    metrics = [widget['metric'] for widget in call_args['widgets']]
    assert "tti_p95" in metrics
    assert "time_between_app_open_and_first_tap_jugar" in metrics

def test_setup_funnel_dashboard(manager, mock_client):
    """Test that the funnel dashboard is configured with the correct steps."""
    manager.setup_funnel_dashboard()
    
    mock_client.create_dashboard.assert_called_once()
    call_args = mock_client.create_dashboard.call_args[1]
    
    assert call_args['title'] == "User Funnel Dashboard"
    
    funnel_widget = next(w for w in call_args['widgets'] if w['type'] == 'funnel')
    expected_steps = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
    assert funnel_widget['steps'] == expected_steps

def test_setup_tti_alert(manager, mock_client):
    """Test that the TTI alert is configured with the correct threshold and duration."""
    manager.setup_tti_alert()
    
    mock_client.create_alert.assert_called_once()
    call_args = mock_client.create_alert.call_args[1]
    
    assert call_args['metric'] == "tti_p95"
    assert call_args['threshold'] == 2.0
    assert call_args['duration_minutes'] == 60
    assert call_args['condition'] == ">"
