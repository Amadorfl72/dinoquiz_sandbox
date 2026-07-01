import pytest
from src.score_tracker import ScoreTracker

@pytest.fixture
def tracker():
    return ScoreTracker()

def test_initial_best_score_is_zero(tracker):
    assert tracker.best_score == 0

def test_new_high_score_updates_best_score(tracker):
    result = tracker.update_best_score(100)
    assert result is True
    assert tracker.best_score == 100

def test_lower_score_does_not_update_best_score(tracker):
    tracker.update_best_score(100)
    result = tracker.update_best_score(50)
    assert result is False
    assert tracker.best_score == 100

def test_equal_score_does_not_update_best_score(tracker):
    tracker.update_best_score(100)
    result = tracker.update_best_score(100)
    assert result is False
    assert tracker.best_score == 100

def test_multiple_updates_track_highest_score(tracker):
    scores = [10, 50, 20, 100, 90, 150, 120]
    for score in scores:
        tracker.update_best_score(score)
    assert tracker.best_score == 150

def test_negative_score_does_not_update_if_best_is_zero(tracker):
    result = tracker.update_best_score(-10)
    assert result is False
    assert tracker.best_score == 0
