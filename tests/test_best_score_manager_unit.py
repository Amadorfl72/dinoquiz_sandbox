"""
Unit tests for the comparison helper used by BestScoreManager (TRIOFSND-44).
"""
import pytest

from src.score.best_score_manager import should_update_best_score


class TestShouldUpdateBestScore:
    """Pure-function tests for the comparison logic in isolation."""

    @pytest.mark.parametrize("new_score,best_score,expected", [
        (150, 100, True),       # strictly greater
        (101, 100, True),       # greater by one
        (100, 100, False),      # equal
        (99, 100, False),       # lower by one
        (0, 100, False),        # zero vs positive
        (100, 0, True),         # positive vs zero
        (0, 0, False),          # both zero
        (-1, 0, False),         # negative vs zero
        (1, None, True),        # first time, positive
        (0, None, False),       # first time, zero
        (-5, None, False),      # first time, negative
        (999999, 999998, True), # large numbers
    ])
    def test_comparison_logic(self, new_score, best_score, expected):
        assert should_update_best_score(new_score, best_score) is expected
