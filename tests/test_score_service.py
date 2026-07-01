import pytest
from score_service import ScoreService

@pytest.fixture
def score_service():
    return ScoreService()

def test_initialize_best_score_when_none_exists(score_service):
    updated = score_service.update_best_score(100)
    assert updated is True
    assert score_service.get_best_score() == 100

def test_update_best_score_when_new_score_is_higher(score_service):
    score_service.update_best_score(100)
    updated = score_service.update_best_score(150)
    assert updated is True
    assert score_service.get_best_score() == 150

def test_do_not_update_best_score_when_new_score_is_lower(score_service):
    score_service.update_best_score(100)
    updated = score_service.update_best_score(50)
    assert updated is False
    assert score_service.get_best_score() == 100

def test_do_not_update_best_score_when_new_score_is_equal(score_service):
    score_service.update_best_score(100)
    updated = score_service.update_best_score(100)
    assert updated is False
    assert score_service.get_best_score() == 100

def test_update_best_score_with_negative_score(score_service):
    updated = score_service.update_best_score(-10)
    assert updated is True
    assert score_service.get_best_score() == -10

def test_update_best_score_with_zero_score(score_service):
    score_service.update_best_score(-10)
    updated = score_service.update_best_score(0)
    assert updated is True
    assert score_service.get_best_score() == 0
