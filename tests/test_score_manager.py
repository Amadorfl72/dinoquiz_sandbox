import pytest
from score_manager import ScoreManager

def test_initial_best_score_is_none():
    manager = ScoreManager()
    assert manager.best_score is None

def test_update_best_score_first_time():
    manager = ScoreManager()
    manager.update_best_score(100)
    assert manager.best_score == 100

def test_update_best_score_higher():
    manager = ScoreManager()
    manager.update_best_score(100)
    manager.update_best_score(150)
    assert manager.best_score == 150

def test_update_best_score_lower():
    manager = ScoreManager()
    manager.update_best_score(100)
    manager.update_best_score(50)
    assert manager.best_score == 100

def test_update_best_score_equal():
    manager = ScoreManager()
    manager.update_best_score(100)
    manager.update_best_score(100)
    assert manager.best_score == 100

def test_update_best_score_negative():
    manager = ScoreManager()
    manager.update_best_score(-10)
    assert manager.best_score == -10
    manager.update_best_score(-20)
    assert manager.best_score == -10

def test_update_best_score_zero():
    manager = ScoreManager()
    manager.update_best_score(0)
    assert manager.best_score == 0
    manager.update_best_score(-5)
    assert manager.best_score == 0
