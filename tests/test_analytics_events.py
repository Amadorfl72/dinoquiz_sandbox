import os
import pytest
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
DB_URL = os.environ.get("TEST_DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app"))


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def cleanup_analytics_events(db_session):
    db_session.execute(text("DELETE FROM analytics_events"))
    db_session.commit()
    yield
    db_session.execute(text("DELETE FROM analytics_events"))
    db_session.commit()


def post_event(payload):
    return requests.post(f"{BASE_URL}/api/analytics/events", json=payload, timeout=10)


def fetch_events(db_session, event_type=None):
    if event_type:
        rows = db_session.execute(
            text("SELECT * FROM analytics_events WHERE event_type = :t"),
            {"t": event_type},
        ).mappings().all()
    else:
        rows = db_session.execute(text("SELECT * FROM analytics_events")).mappings().all()
    return rows


# --- Endpoint existence ---

def test_endpoint_exists_for_analytics_events():
    resp = post_event({"event_type": "app_open", "first_apertura": False})
    assert resp.status_code != 404, f"Expected analytics event ingestion endpoint at POST /api/analytics/events but route not found (404)"


# --- app_open events ---

def test_store_app_open_first_apertura_true(db_session):
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-123",
        "device_id": "device-abc",
    }
    resp = post_event(payload)
    assert resp.status_code in (200, 201), f"Expected 2xx for app_open event, got {resp.status_code}: {resp.text}"

    rows = fetch_events(db_session, "app_open")
    assert len(rows) == 1, "No analytics event record found in database after POST request"
    row = rows[0]
    assert row["event_type"] == "app_open"
    assert row["first_apertura"] is True or row["first_apertura"] == True or str(row["first_apertura"]).lower() == "true"


def test_store_app_open_first_apertura_false(db_session):
    payload = {
        "event_type": "app_open",
        "first_apertura": False,
        "user_id": "user-456",
        "device_id": "device-def",
    }
    resp = post_event(payload)
    assert resp.status_code in (200, 201), f"Expected 2xx for app_open event, got {resp.status_code}: {resp.text}"

    rows = fetch_events(db_session, "app_open")
    assert len(rows) == 1, "No analytics event record found in database after POST request"
    row = rows[0]
    assert row["event_type"] == "app_open"
    assert row["first_apertura"] is False or row["first_apertura"] == False or str(row["first_apertura"]).lower() == "false"


# --- tooltip_shown events ---

def test_store_tooltip_shown_event(db_session):
    payload = {
        "event_type": "tooltip_shown",
        "tooltip_id": "onboarding_tooltip_1",
        "user_id": "user-789",
        "device_id": "device-ghi",
    }
    resp = post_event(payload)
    assert resp.status_code in (200, 201), f"Expected 2xx for tooltip_shown event, got {resp.status_code}: {resp.text}"

    rows = fetch_events(db_session, "tooltip_shown")
    assert len(rows) == 1, "No analytics event record found in database after POST request"
    row = rows[0]
    assert row["event_type"] == "tooltip_shown"
    assert row["tooltip_id"] == "onboarding_tooltip_1"


# --- tooltip_dismissed events ---

def test_store_tooltip_dismissed_event(db_session):
    payload = {
        "event_type": "tooltip_dismissed",
        "tooltip_id": "onboarding_tooltip_2",
        "user_id": "user-000",
        "device_id": "device-jkl",
    }
    resp = post_event(payload)
    assert resp.status_code in (200, 201), f"Expected 2xx for tooltip_dismissed event, got {resp.status_code}: {resp.text}"

    rows = fetch_events(db_session, "tooltip_dismissed")
    assert len(rows) == 1, "No analytics event record found in database after POST request"
    row = rows[0]
    assert row["event_type"] == "tooltip_dismissed"
    assert row["tooltip_id"] == "onboarding_tooltip_2"


# --- PII rejection ---

@pytest.mark.parametrize("pii_field,pii_value", [
    ("email", "user@example.com"),
    ("phone", "+15551234567"),
    ("ssn", "123-45-6789"),
])
def test_reject_events_with_pii_fields(pii_field, pii_value):
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-pii",
        pii_field: pii_value,
    }
    resp = post_event(payload)
    assert resp.status_code == 400, f"Expected 400 response for event payload containing {pii_field} field, got {resp.status_code}"


def test_reject_events_with_nested_pii_fields():
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-nested-pii",
        "metadata": {
            "email": "nested@example.com",
        },
    }
    resp = post_event(payload)
    assert resp.status_code == 400, f"Expected 400 response for event payload containing nested PII field, got {resp.status_code}"


# --- Validation / edge cases ---

def test_reject_unknown_event_type():
    payload = {
        "event_type": "unknown_event",
        "user_id": "user-x",
    }
    resp = post_event(payload)
    assert resp.status_code in (400, 422), f"Expected 4xx for unknown event_type, got {resp.status_code}"


def test_reject_missing_event_type():
    payload = {
        "user_id": "user-y",
    }
    resp = post_event(payload)
    assert resp.status_code in (400, 422), f"Expected 4xx for missing event_type, got {resp.status_code}"


def test_reject_tooltip_shown_without_tooltip_id():
    payload = {
        "event_type": "tooltip_shown",
        "user_id": "user-z",
    }
    resp = post_event(payload)
    assert resp.status_code in (400, 422), f"Expected 4xx for tooltip_shown without tooltip_id, got {resp.status_code}"


def test_reject_tooltip_dismissed_without_tooltip_id():
    payload = {
        "event_type": "tooltip_dismissed",
        "user_id": "user-w",
    }
    resp = post_event(payload)
    assert resp.status_code in (400, 422), f"Expected 4xx for tooltip_dismissed without tooltip_id, got {resp.status_code}"


def test_reject_app_open_without_first_apertura():
    payload = {
        "event_type": "app_open",
        "user_id": "user-v",
    }
    resp = post_event(payload)
    assert resp.status_code in (400, 422), f"Expected 4xx for app_open without first_apertura, got {resp.status_code}"


def test_event_has_timestamp(db_session):
    payload = {
        "event_type": "app_open",
        "first_apertura": True,
        "user_id": "user-ts",
    }
    resp = post_event(payload)
    assert resp.status_code in (200, 201)

    rows = fetch_events(db_session, "app_open")
    assert len(rows) == 1
    row = rows[0]
    assert row.get("created_at") is not None or row.get("timestamp") is not None, "Expected event record to have a timestamp"


def test_multiple_events_stored_separately(db_session):
    events = [
        {"event_type": "app_open", "first_apertura": True, "user_id": "u1"},
        {"event_type": "tooltip_shown", "tooltip_id": "t1", "user_id": "u1"},
        {"event_type": "tooltip_dismissed", "tooltip_id": "t1", "user_id": "u1"},
        {"event_type": "app_open", "first_apertura": False, "user_id": "u2"},
    ]
    for ev in events:
        resp = post_event(ev)
        assert resp.status_code in (200, 201), f"Failed to ingest event {ev}: {resp.status_code} {resp.text}"

    rows = fetch_events(db_session)
    assert len(rows) == 4, f"Expected 4 stored events, found {len(rows)}"
