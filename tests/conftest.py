import pytest


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset any in-memory rate limiter state between tests."""
    yield
