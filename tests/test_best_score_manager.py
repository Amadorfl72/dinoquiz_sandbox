import pytest
from unittest.mock import Mock, MagicMock
from score_manager import BestScoreManager


class TestBestScoreComparison:
    """Tests for best score comparison logic (TRIOFSND-44)."""

    def setup_method(self):
        self.storage = Mock()
        self.storage.get_best_score.return_value = None
        self.manager = BestScoreManager(storage=self.storage)

    # --- No existing best score ---

    def test_first_score_becomes_best_when_no_prior_best(self):
        self.storage.get_best_score.return_value = None
        result = self.manager.update_best_score(score=100)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(100)

    def test_first_score_zero_becomes_best_when_no_prior_best(self):
        self.storage.get_best_score.return_value = None
        result = self.manager.update_best_score(score=0)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(0)

    def test_negative_first_score_becomes_best_when_no_prior_best(self):
        self.storage.get_best_score.return_value = None
        result = self.manager.update_best_score(score=-5)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(-5)

    # --- New score is better ---

    def test_higher_score_updates_best(self):
        self.storage.get_best_score.return_value = 50
        result = self.manager.update_best_score(score=100)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(100)

    def test_marginally_higher_score_updates_best(self):
        self.storage.get_best_score.return_value = 99
        result = self.manager.update_best_score(score=100)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(100)

    def test_negative_score_higher_than_more_negative_best_updates(self):
        self.storage.get_best_score.return_value = -100
        result = self.manager.update_best_score(score=-50)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(-50)

    # --- New score is worse ---

    def test_lower_score_does_not_update_best(self):
        self.storage.get_best_score.return_value = 100
        result = self.manager.update_best_score(score=50)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    def test_marginally_lower_score_does_not_update_best(self):
        self.storage.get_best_score.return_value = 100
        result = self.manager.update_best_score(score=99)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    def test_negative_score_lower_than_best_does_not_update(self):
        self.storage.get_best_score.return_value = -50
        result = self.manager.update_best_score(score=-100)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    # --- New score equals best ---

    def test_equal_score_does_not_update_best(self):
        self.storage.get_best_score.return_value = 100
        result = self.manager.update_best_score(score=100)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    def test_equal_zero_score_does_not_update_best(self):
        self.storage.get_best_score.return_value = 0
        result = self.manager.update_best_score(score=0)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    def test_equal_negative_score_does_not_update_best(self):
        self.storage.get_best_score.return_value = -50
        result = self.manager.update_best_score(score=-50)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    # --- is_new_best (comparison only, no update) ---

    def test_is_new_best_returns_true_when_no_prior_best(self):
        self.storage.get_best_score.return_value = None
        assert self.manager.is_new_best(score=10) is True

    def test_is_new_best_returns_true_when_score_is_higher(self):
        self.storage.get_best_score.return_value = 50
        assert self.manager.is_new_best(score=100) is True

    def test_is_new_best_returns_false_when_score_is_lower(self):
        self.storage.get_best_score.return_value = 100
        assert self.manager.is_new_best(score=50) is False

    def test_is_new_best_returns_false_when_score_is_equal(self):
        self.storage.get_best_score.return_value = 100
        assert self.manager.is_new_best(score=100) is False

    def test_is_new_best_does_not_persist(self):
        self.storage.get_best_score.return_value = 50
        self.manager.is_new_best(score=100)
        self.storage.set_best_score.assert_not_called()

    # --- get_best_score ---

    def test_get_best_score_returns_stored_value(self):
        self.storage.get_best_score.return_value = 250
        assert self.manager.get_best_score() == 250

    def test_get_best_score_returns_none_when_no_score(self):
        self.storage.get_best_score.return_value = None
        assert self.manager.get_best_score() is None

    # --- Sequential updates ---

    def test_sequential_updates_track_best_correctly(self):
        self.storage.get_best_score.return_value = None
        scores = [10, 25, 5, 50, 50, 30, 100, 90]
        expected_best = 0
        for score in scores:
            self.storage.get_best_score.return_value = expected_best if expected_best > 0 or score <= 0 else None
            if expected_best == 0 and self.storage.get_best_score.return_value is None:
                self.storage.get_best_score.return_value = None
            result = self.manager.update_best_score(score=score)
            if self.storage.get_best_score.return_value is None or score > self.storage.get_best_score.return_value:
                assert result is True
                expected_best = score
                self.storage.set_best_score.assert_called_with(score)
            else:
                assert result is False

    def test_multiple_worse_scores_never_update(self):
        self.storage.get_best_score.return_value = 100
        for score in [90, 80, 70, 60, 50, 0, -10]:
            self.storage.set_best_score.reset_mock()
            result = self.manager.update_best_score(score=score)
            assert result is False
            self.storage.set_best_score.assert_not_called()

    # --- Per-player best scores ---

    def test_update_best_score_for_specific_player(self):
        self.storage.get_best_score.return_value = None
        result = self.manager.update_best_score(score=200, player_id="player1")
        assert result is True
        self.storage.get_best_score.assert_called_once_with(player_id="player1")
        self.storage.set_best_score.assert_called_once_with(200, player_id="player1")

    def test_different_players_have_independent_best_scores(self):
        self.storage.get_best_score.side_effect = lambda player_id=None: {"p1": 100, "p2": 50}.get(player_id)

        result_p1 = self.manager.update_best_score(score=80, player_id="p1")
        assert result_p1 is False

        result_p2 = self.manager.update_best_score(score=80, player_id="p2")
        assert result_p2 is True
        self.storage.set_best_score.assert_called_once_with(80, player_id="p2")

    def test_is_new_best_for_specific_player(self):
        self.storage.get_best_score.return_value = 75
        assert self.manager.is_new_best(score=100, player_id="player1") is True
        self.storage.get_best_score.assert_called_once_with(player_id="player1")

    # --- Edge cases ---

    def test_float_score_comparison(self):
        self.storage.get_best_score.return_value = 99.5
        result = self.manager.update_best_score(score=99.6)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(99.6)

    def test_float_equal_score_does_not_update(self):
        self.storage.get_best_score.return_value = 99.5
        result = self.manager.update_best_score(score=99.5)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    def test_very_large_score(self):
        self.storage.get_best_score.return_value = 0
        large = 2**31 - 1
        result = self.manager.update_best_score(score=large)
        assert result is True
        self.storage.set_best_score.assert_called_once_with(large)

    def test_very_small_negative_score(self):
        self.storage.get_best_score.return_value = 0
        small = -(2**31)
        result = self.manager.update_best_score(score=small)
        assert result is False
        self.storage.set_best_score.assert_not_called()

    # --- Invalid inputs ---

    def test_none_score_raises_value_error(self):
        with pytest.raises(ValueError):
            self.manager.update_best_score(score=None)

    def test_non_numeric_score_raises_type_error(self):
        with pytest.raises(TypeError):
            self.manager.update_best_score(score="100")

    def test_nan_score_raises_value_error(self):
        with pytest.raises(ValueError):
            self.manager.update_best_score(score=float('nan'))

    def test_inf_score_raises_value_error(self):
        with pytest.raises(ValueError):
            self.manager.update_best_score(score=float('inf'))
