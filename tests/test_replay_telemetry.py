import pytest
from unittest.mock import patch, MagicMock
from telemetry.replay import send_replay_telemetry, ReplayTelemetry

@pytest.fixture
def mock_telemetry_client():
    with patch('telemetry.replay.telemetry_client') as mock_client:
        yield mock_client

def test_send_replay_telemetry_start_action(mock_telemetry_client):
    send_replay_telemetry(user_id="user_123", replay_id="replay_456", action="start")
    mock_telemetry_client.track.assert_called_once_with(
        event="replay_started",
        properties={"user_id": "user_123", "replay_id": "replay_456", "action": "start"}
    )

def test_send_replay_telemetry_end_action(mock_telemetry_client):
    send_replay_telemetry(user_id="user_123", replay_id="replay_456", action="end")
    mock_telemetry_client.track.assert_called_once_with(
        event="replay_ended",
        properties={"user_id": "user_123", "replay_id": "replay_456", "action": "end"}
    )

def test_send_replay_telemetry_invalid_action(mock_telemetry_client):
    with pytest.raises(ValueError, match="Invalid action"):
        send_replay_telemetry(user_id="user_123", replay_id="replay_456", action="invalid_action")
    mock_telemetry_client.track.assert_not_called()

def test_send_replay_telemetry_missing_user_id(mock_telemetry_client):
    with pytest.raises(ValueError, match="user_id is required"):
        send_replay_telemetry(user_id=None, replay_id="replay_456", action="start")
    mock_telemetry_client.track.assert_not_called()

def test_send_replay_telemetry_missing_replay_id(mock_telemetry_client):
    with pytest.raises(ValueError, match="replay_id is required"):
        send_replay_telemetry(user_id="user_123", replay_id=None, action="start")
    mock_telemetry_client.track.assert_not_called()

def test_replay_telemetry_class_initialization(mock_telemetry_client):
    rt = ReplayTelemetry(user_id="user_123", replay_id="replay_456")
    assert rt.user_id == "user_123"
    assert rt.replay_id == "replay_456"

def test_replay_telemetry_class_track_start(mock_telemetry_client):
    rt = ReplayTelemetry(user_id="user_123", replay_id="replay_456")
    rt.track_start()
    mock_telemetry_client.track.assert_called_once_with(
        event="replay_started",
        properties={"user_id": "user_123", "replay_id": "replay_456", "action": "start"}
    )

def test_replay_telemetry_class_track_end(mock_telemetry_client):
    rt = ReplayTelemetry(user_id="user_123", replay_id="replay_456")
    rt.track_end()
    mock_telemetry_client.track.assert_called_once_with(
        event="replay_ended",
        properties={"user_id": "user_123", "replay_id": "replay_456", "action": "end"}
    )
