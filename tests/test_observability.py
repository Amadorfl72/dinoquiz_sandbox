import pytest
from observability.alerts import AlertManager
from observability.dashboards import DashboardManager

def test_alert_sustained_threshold_1hour():
    """Test that TTI p95 > 2s alert triggers after 1 hour, not 45 minutes."""
    manager = AlertManager()
    alert_config = manager.get_alert_config("tti_p95_high")
    
    assert alert_config["threshold"] == 2.0
    assert alert_config["aggregation_window"] == "60m"
    
    # Simulate metric exceeding threshold for 45 minutes
    triggered_45m = manager.simulate_alert(
        alert_name="tti_p95_high",
        metric_value=2.5,
        duration_minutes=45
    )
    assert not triggered_45m, "Alert should not trigger before 60 minutes of sustained threshold"
    
    # Simulate metric exceeding threshold for 60 minutes
    triggered_60m = manager.simulate_alert(
        alert_name="tti_p95_high",
        metric_value=2.5,
        duration_minutes=60
    )
    assert triggered_60m, "Alert should trigger after 60 minutes of sustained threshold"

def test_funnel_includes_all_stages():
    """Test that the funnel dashboard includes the 'pantalla_inicio' stage."""
    manager = DashboardManager()
    funnel_config = manager.get_dashboard_config("user_funnel")
    
    expected_stages = ["app_open", "pantalla_inicio", "tap_jugar", "partida_iniciada"]
    actual_stages = [stage["id"] for stage in funnel_config["stages"]]
    
    assert len(actual_stages) == 4, "Funnel should have exactly 4 stages"
    assert actual_stages == expected_stages, f"Expected stages {expected_stages}, but got {actual_stages}"
