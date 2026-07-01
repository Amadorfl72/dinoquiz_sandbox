"""
Unit tests for the AnalyticsEvent model used by the ingestion endpoint.
"""
import pytest

from app import db
from app.models.analytics_event import AnalyticsEvent


@pytest.fixture
def app():
    from app import create_app
    app = create_app(testing=True)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_analytics_event_model_has_required_fields(app):
    with app.app_context():
        event = AnalyticsEvent(
            event_type="app_open",
            user_id="user-model-001",
            first_apertura=True,
            tooltip_id=None,
            timestamp="2024-01-01T00:00:00",
        )
        db.session.add(event)
        db.session.commit()

        fetched = AnalyticsEvent.query.filter_by(user_id="user-model-001").first()
        assert fetched is not None
        assert fetched.event_type == "app_open"
        assert fetched.first_apertura is True
        assert fetched.tooltip_id is None


def test_analytics_event_model_supports_tooltip_fields(app):
    with app.app_context():
        event = AnalyticsEvent(
            event_type="tooltip_shown",
            user_id="user-model-002",
            first_apertura=None,
            tooltip_id="welcome_tooltip",
            timestamp="2024-01-01T00:00:00",
        )
        db.session.add(event)
        db.session.commit()

        fetched = AnalyticsEvent.query.filter_by(user_id="user-model-002").first()
        assert fetched is not None
        assert fetched.event_type == "tooltip_shown"
        assert fetched.tooltip_id == "welcome_tooltip"
