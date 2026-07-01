"""
Automated tests for TRIOFSND-44: Best score comparison and update logic.
"""
import pytest
from unittest.mock import MagicMock, call

from src.score.best_score_manager import BestScoreManager


class TestBestScoreComparisonAndUpdate:
    """Tests covering best score retrieval, comparison, update, and UI feedback."""

    @pytest.fixture
    def mock_safe_wrapper(self):
        """A mock safe wrapper that simulates persistent score storage."""
        wrapper = MagicMock()
        wrapper.get_best_score.return_value = 0
        wrapper.set_best_score = MagicMock()
        return wrapper

    @pytest.fixture
    def mock_ui_feedback(self):
        """A mock UI feedback event emitter."""
        return MagicMock()

    @pytest.fixture
    def manager(self, mock_safe_wrapper, mock_ui_feedback):
        return BestScoreManager(
            safe_wrapper=mock_safe_wrapper,
            ui_feedback=mock_ui_feedback,
        )

    # ── New score strictly greater than best ──────────────────────────

    def test_new_score_greater_updates_stored_value(self, manager, mock_safe_wrapper):
        mock_safe_wrapper.get_best_score.return_value = 100
        manager.on_game_completion(150)
        mock_safe_wrapper.set_best_score.assert_called_once_with(150)

    def test_new_score_greater_triggers_ui_feedback_event(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 100
        manager.on_game_completion(150)
        mock_ui_feedback.trigger_best_score_event.assert_called_once()

    def test_new_score_greater_triggers_event_with_correct_score(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 100
        manager.on_game_completion(250)
        mock_ui_feedback.trigger_best_score_event.assert_called_once_with(250)

    # ── New score equal to best ───────────────────────────────────────

    def test_equal_score_does_not_update_stored_value(self, manager, mock_safe_wrapper):
        mock_safe_wrapper.get_best_score.return_value = 200
        manager.on_game_completion(200)
        mock_safe_wrapper.set_best_score.assert_not_called()

    def test_equal_score_does_not_trigger_ui_feedback(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 200
        manager.on_game_completion(200)
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    # ── New score lower than best ─────────────────────────────────────

    def test_lower_score_does_not_update_stored_value(self, manager, mock_safe_wrapper):
        mock_safe_wrapper.get_best_score.return_value = 500
        manager.on_game_completion(499)
        mock_safe_wrapper.set_best_score.assert_not_called()

    def test_lower_score_does_not_trigger_ui_feedback(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 500
        manager.on_game_completion(1)
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    # ── First-time / no existing best score ───────────────────────────

    def test_first_time_any_positive_score_updates(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = None
        manager.on_game_completion(42)
        mock_safe_wrapper.set_best_score.assert_called_once_with(42)
        mock_ui_feedback.trigger_best_score_event.assert_called_once_with(42)

    def test_first_time_zero_score_does_not_update(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = None
        manager.on_game_completion(0)
        mock_safe_wrapper.set_best_score.assert_not_called()
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    # ── Safe wrapper retrieval is always called ───────────────────────

    def test_retrieves_best_score_from_safe_wrapper(self, manager, mock_safe_wrapper):
        manager.on_game_completion(100)
        mock_safe_wrapper.get_best_score.assert_called_once()

    # ── Edge cases ────────────────────────────────────────────────────

    def test_negative_new_score_does_not_update_when_best_is_zero(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 0
        manager.on_game_completion(-10)
        mock_safe_wrapper.set_best_score.assert_not_called()
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    def test_score_one_greater_than_best_updates(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 999
        manager.on_game_completion(1000)
        mock_safe_wrapper.set_best_score.assert_called_once_with(1000)
        mock_ui_feedback.trigger_best_score_event.assert_called_once_with(1000)

    def test_score_one_less_than_best_does_not_update(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 1000
        manager.on_game_completion(999)
        mock_safe_wrapper.set_best_score.assert_not_called()
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    def test_consecutive_completions_update_in_sequence(self, manager, mock_safe_wrapper, mock_ui_feedback):
        # First completion: best is 0, score 50 → update
        mock_safe_wrapper.get_best_score.return_value = 0
        manager.on_game_completion(50)
        mock_safe_wrapper.set_best_score.assert_called_with(50)

        # Second completion: best is now 50, score 30 → no update
        mock_safe_wrapper.get_best_score.return_value = 50
        mock_safe_wrapper.set_best_score.reset_mock()
        mock_ui_feedback.trigger_best_score_event.reset_mock()
        manager.on_game_completion(30)
        mock_safe_wrapper.set_best_score.assert_not_called()
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

        # Third completion: best is 50, score 75 → update
        mock_safe_wrapper.get_best_score.return_value = 50
        mock_safe_wrapper.set_best_score.reset_mock()
        mock_ui_feedback.trigger_best_score_event.reset_mock()
        manager.on_game_completion(75)
        mock_safe_wrapper.set_best_score.assert_called_once_with(75)
        mock_ui_feedback.trigger_best_score_event.assert_called_once_with(75)

    # ── Safe wrapper error handling ───────────────────────────────────

    def test_safe_wrapper_read_error_does_not_crash(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.side_effect = RuntimeError("storage read failed")
        with pytest.raises(RuntimeError):
            manager.on_game_completion(100)
        mock_safe_wrapper.set_best_score.assert_not_called()
        mock_ui_feedback.trigger_best_score_event.assert_not_called()

    def test_safe_wrapper_write_error_does_not_trigger_ui_event(self, manager, mock_safe_wrapper, mock_ui_feedback):
        mock_safe_wrapper.get_best_score.return_value = 10
        mock_safe_wrapper.set_best_score.side_effect = RuntimeError("storage write failed")
        with pytest.raises(RuntimeError):
            manager.on_game_completion(20)
        mock_ui_feedback.trigger_best_score_event.assert_not_called()
