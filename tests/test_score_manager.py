import unittest
from unittest.mock import MagicMock

from trio_fsnd.score_manager import ScoreManager

class TestScoreManager(unittest.TestCase):
    def setUp(self):
        self.mock_safe_wrapper = MagicMock()
        self.mock_ui_feedback = MagicMock()
        self.manager = ScoreManager(self.mock_safe_wrapper, self.mock_ui_feedback)

    def test_new_score_greater_than_best_updates_and_triggers_event(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self.manager.on_game_completion(150)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_called_once_with(150)
        self.mock_ui_feedback.trigger_event.assert_called_once()

    def test_new_score_equal_to_best_does_nothing(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self.manager.on_game_completion(100)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

    def test_new_score_lower_than_best_does_nothing(self):
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self.manager.on_game_completion(50)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

if __name__ == '__main__':
    unittest.main()
