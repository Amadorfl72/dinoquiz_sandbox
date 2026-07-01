import pytest
from app import create_app, db
from app.models.analytics_event import AnalyticsEvent
from app.models.user import User

@pytest.fixture(scope='module')
def test_client():
    flask_app = create_app('testing')
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['TESTING'] = True

    with flask_app.app_context():
        db.create_all()
        # Create a returning user
        returning_user = User(username='returning_user', email='returning@test.com')
        db.session.add(returning_user)
        db.session.commit()

    testing_client = flask_app.test_client()

    ctx = flask_app.app_context()
    ctx.push()

    yield testing_client

    with flask_app.app_context():
        db.drop_all()
    ctx.pop()


def test_app_open_event_first_time(test_client):
    """
    TRIOFSND-54: should store app_open event with first_apertura=true for first-time users
    """
    response = test_client.post('/api/analytics/events', json={
        'event_type': 'app_open',
        'user_id': 'new_user_123',
        'properties': {
            'first_apertura': True
        }
    })
    assert response.status_code == 201
    
    event = AnalyticsEvent.query.filter_by(event_type='app_open', user_id='new_user_123').first()
    assert event is not None
    assert event.properties.get('first_apertura') is True

def test_app_open_event_returning_user(test_client):
    """
    TRIOFSND-54: should store app_open event with first_apertura=false for returning users
    """
    response = test_client.post('/api/analytics/events', json={
        'event_type': 'app_open',
        'user_id': 'returning_user',
        'properties': {
            'first_apertura': False
        }
    })
    assert response.status_code == 201
    
    event = AnalyticsEvent.query.filter_by(event_type='app_open', user_id='returning_user').first()
    assert event is not None
    assert event.properties.get('first_apertura') is False

def test_tooltip_shown_event(test_client):
    """
    TRIOFSND-54: should store tooltip_shown event with tooltip identifier
    """
    response = test_client.post('/api/analytics/events', json={
        'event_type': 'tooltip_shown',
        'user_id': 'returning_user',
        'properties': {
            'tooltip_id': 'welcome_tooltip'
        }
    })
    assert response.status_code == 201
    
    event = AnalyticsEvent.query.filter_by(event_type='tooltip_shown', user_id='returning_user').first()
    assert event is not None
    assert event.properties.get('tooltip_id') == 'welcome_tooltip'

def test_tooltip_dismissed_event(test_client):
    """
    TRIOFSND-54: should store tooltip_dismissed event with tooltip identifier
    """
    response = test_client.post('/api/analytics/events', json={
        'event_type': 'tooltip_dismissed',
        'user_id': 'returning_user',
        'properties': {
            'tooltip_id': 'welcome_tooltip'
        }
    })
    assert response.status_code == 201
    
    event = AnalyticsEvent.query.filter_by(event_type='tooltip_dismissed', user_id='returning_user').first()
    assert event is not None
    assert event.properties.get('tooltip_id') == 'welcome_tooltip'

def test_reject_pii_in_events(test_client):
    """
    TRIOFSND-54: should reject events containing PII fields
    """
    response = test_client.post('/api/analytics/events', json={
        'event_type': 'app_open',
        'user_id': 'new_user_456',
        'properties': {
            'first_apertura': True,
            'email': 'user@example.com'  # PII field
        }
    })
    assert response.status_code == 400
    
    event = AnalyticsEvent.query.filter_by(user_id='new_user_456').first()
    assert event is None
