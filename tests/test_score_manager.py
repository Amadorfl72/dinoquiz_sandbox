import pytest
from score_manager import ScoreManager

def test_initial_best_score_is_none():
    manager = ScoreManager()
    assert manager.best_score is None

def test_update_best_score_with_first_score():
    manager = ScoreManager()
    manager.update_score(100)
    assert manager.best_score == 100

def test_update_best_score_with_higher_score():
    manager = ScoreManager(best_score=100)
    manager.update_score(200)
    assert manager.best_score == 200

def test_update_best_score_with_lower_score():
    manager = ScoreManager(best_score=100)
    manager.update_score(50)
    assert manager.best_score == 100

def test_update_best_score_with_equal_score():
    manager = ScoreManager(best_score=100)
    manager.update_score(100)
    assert manager.best_score == 100

def test_update_best_score_with_negative_score():
    manager = ScoreManager(best_score=-10)
    manager.update_score(-5)
    assert manager.best_score == -5

def test_update_best_score_with_zero():
    manager = ScoreManager(best_score=0)
    manager.update_score(10)
    assert manager.best_score == 10
