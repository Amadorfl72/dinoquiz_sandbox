import pytest
from datetime import datetime, timezone
from app import create_app, db
from app.models import MetricEvent


@pytest.fixture
def client():
    app = create_app(testing=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        db.create_all()
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.drop_all()


VALID_METRIC_NAMES = ["game_started", "app_open", "level_completed", "session_end"]


class TestMetricsIngestionEndpoint:
    """Tests for POST /api/v1/metrics endpoint (TRIOFSND-13)."""

    URL = "/api/v1/metrics"

    def test_ingest_single_valid_metric_returns_201(self, client):
        payload = {
            "metric_name": "game_started",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201
        assert resp.get_json()["status"] == "accepted"

    def test_ingest_app_open_metric_returns_201(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 5,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201

    def test_ingest_metric_persists_to_database(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 3,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        client.post(self.URL, json=payload)
        with client.application.app_context():
            events = MetricEvent.query.all()
            assert len(events) == 1
            assert events[0].metric_name == "app_open"
            assert events[0].count == 3

    def test_ingest_batch_of_valid_metrics_returns_201(self, client):
        payload = {
            "metrics": [
                {
                    "metric_name": "game_started",
                    "count": 10,
                    "timestamp": "2024-01-15T10:30:00Z",
                },
                {
                    "metric_name": "app_open",
                    "count": 7,
                    "timestamp": "2024-01-15T10:31:00Z",
                },
            ]
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201
        assert resp.get_json()["accepted"] == 2

    def test_ingest_metric_without_count_defaults_to_one(self, client):
        payload = {
            "metric_name": "app_open",
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201
        with client.application.app_context():
            event = MetricEvent.query.first()
            assert event.count == 1

    def test_ingest_metric_without_timestamp_uses_current_time(self, client):
        payload = {"metric_name": "app_open", "count": 1}
        before = datetime.now(timezone.utc)
        resp = client.post(self.URL, json=payload)
        after = datetime.now(timezone.utc)
        assert resp.status_code == 201
        with client.application.app_context():
            event = MetricEvent.query.first()
            assert before <= event.timestamp <= after

    @pytest.mark.parametrize("metric_name", VALID_METRIC_NAMES)
    def test_all_allowed_metric_names_accepted(self, client, metric_name):
        payload = {
            "metric_name": metric_name,
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201

    def test_ingest_unknown_metric_name_returns_400(self, client):
        payload = {
            "metric_name": "user_email_collected",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        assert "invalid metric_name" in resp.get_json()["error"].lower()

    def test_ingest_missing_metric_name_returns_400(self, client):
        payload = {"count": 1, "timestamp": "2024-01-15T10:30:00Z"}
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        assert "metric_name" in resp.get_json()["error"].lower()

    def test_ingest_empty_metric_name_returns_400(self, client):
        payload = {
            "metric_name": "",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400

    def test_ingest_negative_count_returns_400(self, client):
        payload = {
            "metric_name": "app_open",
            "count": -1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        assert "count" in resp.get_json()["error"].lower()

    def test_ingest_zero_count_returns_400(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 0,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400

    def test_ingest_non_integer_count_returns_400(self, client):
        payload = {
            "metric_name": "app_open",
            "count": "five",
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400

    def test_ingest_count_exceeding_max_returns_400(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 1_000_001,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400

    def test_ingest_invalid_timestamp_format_returns_400(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 1,
            "timestamp": "not-a-date",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        assert "timestamp" in resp.get_json()["error"].lower()

    def test_ingest_malformed_json_returns_400(self, client):
        resp = client.post(
            self.URL,
            data="{bad json",
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_ingest_non_json_content_type_returns_415(self, client):
        resp = client.post(
            self.URL,
            data="metric_name=app_open&count=1",
            content_type="application/x-www-form-urlencoded",
        )
        assert resp.status_code == 415

    def test_get_method_not_allowed_returns_405(self, client):
        resp = client.get(self.URL)
        assert resp.status_code == 405

    def test_put_method_not_allowed_returns_405(self, client):
        resp = client.put(self.URL, json={})
        assert resp.status_code == 405

    def test_delete_method_not_allowed_returns_405(self, client):
        resp = client.delete(self.URL)
        assert resp.status_code == 405


class TestNoPIIEnforcement:
    """Ensure the endpoint rejects any PII fields per TRIOFSND-13."""

    URL = "/api/v1/metrics"

    @pytest.mark.parametrize(
        "pii_field,pii_value",
        [
            ("user_id", "abc123"),
            ("email", "user@example.com"),
            ("ip_address", "192.168.1.1"),
            ("device_id", "device-uuid-123"),
            ("user_agent", "Mozilla/5.0"),
            ("phone", "+15551234567"),
            ("username", "johndoe"),
            ("session_id", "sess-abc123"),
        ],
    )
    def test_pii_fields_rejected_with_400(self, client, pii_field, pii_value):
        payload = {
            "metric_name": "app_open",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            pii_field: pii_value,
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        assert "pii" in resp.get_json()["error"].lower() or "not allowed" in resp.get_json()["error"].lower()

    def test_no_pii_stored_in_database(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        client.post(self.URL, json=payload)
        with client.application.app_context():
            event = MetricEvent.query.first()
            columns = {c.name for c in MetricEvent.__table__.columns}
            pii_columns = {"user_id", "email", "ip_address", "device_id", "phone", "username"}
            assert not (columns & pii_columns)

    def test_nested_pii_in_metadata_rejected(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "metadata": {"user_email": "leak@example.com"},
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400


class TestBatchIngestion:
    """Tests for batch metric ingestion."""

    URL = "/api/v1/metrics"

    def test_batch_with_one_invalid_metric_rejects_all_atomically(self, client):
        payload = {
            "metrics": [
                {
                    "metric_name": "app_open",
                    "count": 1,
                    "timestamp": "2024-01-15T10:30:00Z",
                },
                {
                    "metric_name": "invalid_metric",
                    "count": 1,
                    "timestamp": "2024-01-15T10:30:00Z",
                },
            ]
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 400
        with client.application.app_context():
            assert MetricEvent.query.count() == 0

    def test_empty_batch_returns_400(self, client):
        resp = client.post(self.URL, json={"metrics": []})
        assert resp.status_code == 400

    def test_batch_exceeding_max_size_returns_400(self, client):
        metrics = [
            {
                "metric_name": "app_open",
                "count": 1,
                "timestamp": "2024-01-15T10:30:00Z",
            }
            for _ in range(1001)
        ]
        resp = client.post(self.URL, json={"metrics": metrics})
        assert resp.status_code == 400
        assert "max" in resp.get_json()["error"].lower()

    def test_batch_all_valid_persists_all(self, client):
        metrics = [
            {
                "metric_name": name,
                "count": i + 1,
                "timestamp": "2024-01-15T10:30:00Z",
            }
            for i, name in enumerate(VALID_METRIC_NAMES)
        ]
        resp = client.post(self.URL, json={"metrics": metrics})
        assert resp.status_code == 201
        with client.application.app_context():
            assert MetricEvent.query.count() == len(VALID_METRIC_NAMES)


class TestResponseFormat:
    """Validate response body structure."""

    URL = "/api/v1/metrics"

    def test_single_metric_response_has_status_field(self, client):
        resp = client.post(
            self.URL,
            json={
                "metric_name": "app_open",
                "count": 1,
                "timestamp": "2024-01-15T10:30:00Z",
            },
        )
        body = resp.get_json()
        assert "status" in body
        assert body["status"] == "accepted"

    def test_batch_response_has_accepted_count(self, client):
        resp = client.post(
            self.URL,
            json={
                "metrics": [
                    {
                        "metric_name": "app_open",
                        "count": 1,
                        "timestamp": "2024-01-15T10:30:00Z",
                    },
                    {
                        "metric_name": "game_started",
                        "count": 1,
                        "timestamp": "2024-01-15T10:30:00Z",
                    },
                ]
            },
        )
        body = resp.get_json()
        assert "accepted" in body
        assert body["accepted"] == 2

    def test_error_response_has_error_field(self, client):
        resp = client.post(self.URL, json={"metric_name": "bad"})
        body = resp.get_json()
        assert "error" in body
        assert isinstance(body["error"], str)
        assert len(body["error"]) > 0


class TestIdempotency:
    """Optional: test that duplicate submissions are handled gracefully."""

    URL = "/api/v1/metrics"

    def test_duplicate_metric_with_same_timestamp_still_accepted(self, client):
        payload = {
            "metric_name": "app_open",
            "count": 1,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        resp1 = client.post(self.URL, json=payload)
        resp2 = client.post(self.URL, json=payload)
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        with client.application.app_context():
            assert MetricEvent.query.count() == 2
