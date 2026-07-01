"""
Automated tests for TRIOFSND-54: Analytics Event Tracking Integration.
Covers app_open, tooltip_shown, tooltip_dismissed events and PII rejection.
"""
import pytest
from datetime import datetime

from app import create_app, db
from app.models.analytics_event import AnalyticsEvent


@pytest.fixture
def app():
    app = create_app(testing=True)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def cleanup_events(app):
    with app.app_context():
        AnalyticsEvent.query.delete()
        db.session.commit()
    yield
    with app.app_context():
        AnalyticsEvent.query.delete()
        db.session.commit()


class TestAnalyticsEventsEndpoint:
    """Verify the ingestion endpoint exists and accepts valid payloads."""

    def test_endpoint_exists_for_app_open(self, client, cleanup_events):
        payload = {
            "event_type": "app_open",
            "user_id": "user-123",
            "first_apertura": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code != 404, "Expected analytics event ingestion endpoint at POST /api/analytics/events but route not found (404)"
        assert resp.status_code in (200, 201)

    def test_endpoint_exists_for_tooltip_shown(self, client, cleanup_events):
        payload = {
            "event_type": "tooltip_shown",
            "user_id": "user-123",
            "tooltip_id": "welcome_tooltip",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code != 404, "Expected analytics event ingestion endpoint at POST /api/analytics/events but route not found (404)"
        assert resp.status_code in (200, 201)

    def test_endpoint_exists_for_tooltip_dismissed(self, client, cleanup_events):
        payload = {
            "event_type": "tooltip_dismissed",
            "user_id": "user-123",
            "tooltip_id": "welcome_tooltip",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code != 404, "Expected analytics event ingestion endpoint at POST /api/analytics/events but route not found (404)"
        assert resp.status_code in (200, 201)


class TestAppOpenEventStorage:
    """Verify app_open events are persisted with the first_apertura flag."""

    def test_store_app_open_first_time_user(self, client, app, cleanup_events):
        payload = {
            "event_type": "app_open",
            "user_id": "user-first-001",
            "first_apertura": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code in (200, 201)

        with app.app_context():
            events = AnalyticsEvent.query.filter_by(
                event_type="app_open", user_id="user-first-001"
            ).all()
            assert len(events) == 1, "No analytics event record found in database after POST request"
            stored = events[0]
            assert stored.event_type == "app_open"
            assert stored.user_id == "user-first-001"
            assert stored.first_apertura is True

    def test_store_app_open_returning_user(self, client, app, cleanup_events):
        payload = {
            "event_type": "app_open",
            "user_id": "user-returning-001",
            "first_apertura": False,
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code in (200, 201)

        with app.app_context():
            events = AnalyticsEvent.query.filter_by(
                event_type="app_open", user_id="user-returning-001"
            ).all()
            assert len(events) == 1, "No analytics event record found in database after POST request"
            stored = events[0]
            assert stored.event_type == "app_open"
            assert stored.user_id == "user-returning-001"
            assert stored.first_apertura is False


class TestTooltipShownEventStorage:
    """Verify tooltip_shown events are persisted with the tooltip identifier."""

    def test_store_tooltip_shown_with_identifier(self, client, app, cleanup_events):
        payload = {
            "event_type": "tooltip_shown",
            "user_id": "user-tooltip-001",
            "tooltip_id": "onboarding_step_1",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code in (200, 201)

        with app.app_context():
            events = AnalyticsEvent.query.filter_by(
                event_type="tooltip_shown", user_id="user-tooltip-001"
            ).all()
            assert len(events) == 1, "No analytics event record found in database after POST request"
            stored = events[0]
            assert stored.event_type == "tooltip_shown"
            assert stored.tooltip_id == "onboarding_step_1"


class TestTooltipDismissedEventStorage:
    """Verify tooltip_dismissed events are persisted with the tooltip identifier."""

    def test_store_tooltip_dismissed_with_identifier(self, client, app, cleanup_events):
        payload = {
            "event_type": "tooltip_dismissed",
            "user_id": "user-tooltip-002",
            "tooltip_id": "onboarding_step_2",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code in (200, 201)

        with app.app_context():
            events = AnalyticsEvent.query.filter_by(
                event_type="tooltip_dismissed", user_id="user-tooltip-002"
            ).all()
            assert len(events) == 1, "No analytics event record found in database after POST request"
            stored = events[0]
            assert stored.event_type == "tooltip_dismissed"
            assert stored.tooltip_id == "onboarding_step_2"


class TestPIIRejection:
    """Verify payloads containing PII fields are rejected with 400."""

    @pytest.mark.parametrize(
        "pii_field,pii_value",
        [
            ("email", "user@example.com"),
            ("phone", "+15551234567"),
            ("ssn", "123-45-6789"),
            ("full_name", "Jane Doe"),
        ],
    )
    def test_rejects_pii_fields(self, client, app, cleanup_events, pii_field, pii_value):
        payload = {
            "event_type": "app_open",
            "user_id": "user-pii-001",
            "first_apertura": True,
            "timestamp": datetime.utcnow().isoformat(),
            pii_field: pii_value,
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400, (
            f"Expected 400 response for event payload containing {pii_field} field, "
            f"got {resp.status_code}"
        )

        with app.app_context():
            count = AnalyticsEvent.query.filter_by(user_id="user-pii-001").count()
            assert count == 0, "PII-containing event should not be persisted"

    def test_rejects_pii_in_nested_payload(self, client, app, cleanup_events):
        payload = {
            "event_type": "tooltip_shown",
            "user_id": "user-pii-002",
            "tooltip_id": "welcome_tooltip",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "email": "leak@example.com",
            },
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400, (
            "Expected 400 response for event payload containing nested email field, "
            f"got {resp.status_code}"
        )


class TestPayloadValidation:
    """Verify basic payload validation and error handling."""

    def test_missing_event_type_returns_400(self, client, cleanup_events):
        payload = {
            "user_id": "user-123",
            "first_apertura": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400

    def test_unknown_event_type_returns_400(self, client, cleanup_events):
        payload = {
            "event_type": "unknown_event",
            "user_id": "user-123",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400

    def test_missing_user_id_returns_400(self, client, cleanup_events):
        payload = {
            "event_type": "app_open",
            "first_apertura": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400

    def test_tooltip_shown_requires_tooltip_id(self, client, cleanup_events):
        payload = {
            "event_type": "tooltip_shown",
            "user_id": "user-123",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400

    def test_tooltip_dismissed_requires_tooltip_id(self, client, cleanup_events):
        payload = {
            "event_type": "tooltip_dismissed",
            "user_id": "user-123",
            "timestamp": datetime.utcnow().isoformat(),
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code == 400

    def test_invalid_json_returns_400(self, client, cleanup_events):
        resp = client.post(
            "/api/analytics/events",
            data="{not valid json",
            content_type="application/json",
        )
        assert resp.status_code == 400


class TestEventIdempotencyAndTimestamp:
    """Verify timestamps and idempotent storage behavior."""

    def test_stored_event_has_timestamp(self, client, app, cleanup_events):
        ts = datetime.utcnow().isoformat()
        payload = {
            "event_type": "app_open",
            "user_id": "user-ts-001",
            "first_apertura": True,
            "timestamp": ts,
        }
        resp = client.post("/api/analytics/events", json=payload)
        assert resp.status_code in (200, 201)

        with app.app_context():
            stored = AnalyticsEvent.query.filter_by(user_id="user-ts-001").first()
            assert stored is not None
            assert stored.timestamp is not None

    def test_multiple_events_for_same_user_stored(self, client, app, cleanup_events):
        base_payload = {
            "event_type": "tooltip_shown",
            "user_id": "user-multi-001",
            "tooltip_id": "tip_a",
            "timestamp": datetime.utcnow().isoformat(),
        }
        for i in range(3):
            payload = dict(base_payload)
            payload["tooltip_id"] = f"tip_{i}"
            resp = client.post("/api/analytics/events", json=payload)
            assert resp.status_code in (200, 201)

        with app.app_context():
            count = AnalyticsEvent.query.filter_by(user_id="user-multi-001").count()
            assert count == 3
