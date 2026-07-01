import pytest
from unittest.mock import MagicMock

# Assuming the implementation is in a module called `game_logic`
# from game_logic import GameCompletionHandler

class TestGameCompletionHandler:
    def setup_method(self):
        self.mock_safe_wrapper = MagicMock()
        self.mock_ui_feedback = MagicMock()
        # Initialize the handler with mocked dependencies
        self.handler = GameCompletionHandler(self.mock_safe_wrapper, self.mock_ui_feedback)

    def test_new_score_greater_than_best_updates_and_triggers_ui(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        new_score = 150

        self.handler.on_game_completion(new_score)

        self.mock_safe_wrapper.update_best_score.assert_called_once_with(150)
        self.mock_ui_feedback.trigger_event.assert_called_once()

    def test_new_score_equal_to_best_does_nothing(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        new_score = 100

        self.handler.on_game_completion(new_score)

        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

    def test_new_score_lower_than_best_does_nothing(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        new_score = 50

        self.handler.on_game_completion(new_score)

        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

    def test_no_existing_best_score_updates_and_triggers_ui(self):
        self.mock_safe_wrapper.get_best_score.return_value = None
        new_score = 10

        self.handler.on_game_completion(new_score)

        self.mock_safe_wrapper.update_best_score.assert_called_once_with(10)
        self.mock_ui_feedback.trigger_event.assert_called_once()
