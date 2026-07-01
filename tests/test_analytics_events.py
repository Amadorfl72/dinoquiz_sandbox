import pytest
from datetime import datetime, timezone
from app import app, db
from app.models import AnalyticsEvent


@pytest.fixture
def client():
    """Provide a Flask test client with a clean database state."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            AnalyticsEvent.query.delete()
            db.session.commit()
            yield client
            AnalyticsEvent.query.delete()
            db.session.commit()
            db.session.remove()


def test_app_open_event_endpoint_exists(client):
    """should create endpoint to receive app_open events with first_apertura flag"""
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-123",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201, (
        f"Expected analytics event ingestion endpoint at POST /api/analytics/events "
        f"but route not found ({response.status_code})"
    )


def test_store_app_open_first_apertura_true(client):
    """should store app_open event with first_apertura=true for first-time users"""
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-first",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201
    record = AnalyticsEvent.query.filter_by(
        user_id="user-first", event_type="app_open"
    ).first()
    assert record is not None, (
        "No analytics event record found in database after POST request"
    )
    assert record.first_apertura is True


def test_store_app_open_first_apertura_false(client):
    """should store app_open event with first_apertura=false for returning users"""
    payload = {
        "event_type": "app_open",
        "first_apertura": False,
        "user_id": "user-returning",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201
    record = AnalyticsEvent.query.filter_by(
        user_id="user-returning", event_type="app_open"
    ).first()
    assert record is not None, (
        "No analytics event record found in database after POST request"
    )
    assert record.first_apertura is False


def test_tooltip_shown_event_endpoint_exists(client):
    """should create endpoint to receive tooltip_shown events"""
    payload = {
        "event_type": "tooltip_shown",
        "tooltip_id": "tooltip-1",
        "user_id": "user-123",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201, (
        f"Expected analytics event ingestion endpoint at POST /api/analytics/events "
        f"but route not found ({response.status_code})"
    )


def test_store_tooltip_shown_event(client):
    """should store tooltip_shown event with tooltip identifier"""
    payload = {
        "event_type": "tooltip_shown",
        "tooltip_id": "tooltip-abc",
        "user_id": "user-456",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201
    record = AnalyticsEvent.query.filter_by(
        event_type="tooltip_shown", tooltip_id="tooltip-abc"
    ).first()
    assert record is not None, (
        "No analytics event record found in database after POST request"
    )
    assert record.tooltip_id == "tooltip-abc"


def test_tooltip_dismissed_event_endpoint_exists(client):
    """should create endpoint to receive tooltip_dismissed events"""
    payload = {
        "event_type": "tooltip_dismissed",
        "tooltip_id": "tooltip-2",
        "user_id": "user-123",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201, (
        f"Expected analytics event ingestion endpoint at POST /api/analytics/events "
        f"but route not found ({response.status_code})"
    )


def test_store_tooltip_dismissed_event(client):
    """should store tooltip_dismissed event with tooltip identifier"""
    payload = {
        "event_type": "tooltip_dismissed",
        "tooltip_id": "tooltip-xyz",
        "user_id": "user-789",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 201
    record = AnalyticsEvent.query.filter_by(
        event_type="tooltip_dismissed", tooltip_id="tooltip-xyz"
    ).first()
    assert record is not None, (
        "No analytics event record found in database after POST request"
    )
    assert record.tooltip_id == "tooltip-xyz"


def test_reject_events_containing_pii_fields(client):
    """should reject events containing PII fields"""
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-pii",
        "email": "user@example.com",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    response = client.post('/api/analytics/events', json=payload)
    assert response.status_code == 400, (
        f"Expected 400 response for event payload containing email field, "
        f"got {response.status_code}"
    )
    record = AnalyticsEvent.query.filter_by(user_id="user-pii").first()
    assert record is None, "PII event should not be stored in database"
