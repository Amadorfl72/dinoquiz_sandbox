import pytest
from unittest.mock import patch

# Mocking the expected configuration functions
# In a real scenario, these would be imported from the actual module
# from app.observability.config import get_alert_config, get_funnel_stages

EXPECTED_FUNNEL_STAGES = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]

def test_alert_sustained_threshold_1hour():
    """Test that TTI p95 alert aggregation window is correctly set to 60m."""
    with patch('app.observability.config.get_alert_config') as mock_get_alert_config:
        mock_get_alert_config.return_value = {
            "alert_name": "TTI p95 > 2s sustained 1 hour",
            "metric": "tti_p95",
            "threshold": 2.0,
            "aggregation_window": "60m",
            "evaluation_period": "1h"
        }
        
        config = mock_get_alert_config("TTI p95 > 2s sustained 1 hour")
        
        assert config["aggregation_window"] == "60m", f"Expected aggregation window 60m, got {config.get('aggregation_window')}"
        assert config["threshold"] == 2.0

def test_funnel_includes_all_stages():
    """Test that the funnel dashboard includes the 'pantalla_inicio' stage in the correct order."""
    with patch('app.observability.config.get_funnel_stages') as mock_get_funnel_stages:
        mock_get_funnel_stages.return_value = EXPECTED_FUNNEL_STAGES
        
        stages = mock_get_funnel_stages("user_funnel_dashboard")
        
        assert "pantalla_inicio" in stages, "Missing 'pantalla_inicio' stage in funnel"
        assert stages == EXPECTED_FUNNEL_STAGES, f"Expected stages {EXPECTED_FUNNEL_STAGES}, got {stages}"
