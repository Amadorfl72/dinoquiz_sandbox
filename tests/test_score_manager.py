import unittest
from unittest.mock import MagicMock, patch

# Assuming the implementation is in a module called `score_manager`
# from score_manager import ScoreManager

class TestScoreManager(unittest.TestCase):
    def setUp(self):
        self.mock_safe_wrapper = MagicMock()
        self.mock_ui_feedback = MagicMock()
        # Initialize the manager with mocked dependencies
        # self.manager = ScoreManager(self.mock_safe_wrapper, self.mock_ui_feedback)
        pass

    def _invoke_completion(self, new_score):
        # Placeholder for actual method call
        # self.manager.handle_game_completion(new_score)
        pass

    def test_new_score_greater_than_best(self):
        """Test that a new high score updates the stored value and triggers UI feedback."""
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self._invoke_completion(150)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_called_once_with(150)
        self.mock_ui_feedback.trigger_event.assert_called_once()

    def test_new_score_equal_to_best(self):
        """Test that an equal score does not update the stored value or trigger UI feedback."""
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self._invoke_completion(100)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

    def test_new_score_lower_than_best(self):
        """Test that a lower score does not update the stored value or trigger UI feedback."""
        self.mock_safe_wrapper.get_best_score.return_value = 100
        self._invoke_completion(50)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_not_called()
        self.mock_ui_feedback.trigger_event.assert_not_called()

    def test_no_previous_best_score(self):
        """Test that the first score ever updates the stored value and triggers UI feedback."""
        self.mock_safe_wrapper.get_best_score.return_value = None
        self._invoke_completion(10)
        
        self.mock_safe_wrapper.get_best_score.assert_called_once()
        self.mock_safe_wrapper.update_best_score.assert_called_once_with(10)
        self.mock_ui_feedback.trigger_event.assert_called_once()

if __name__ == '__main__':
    unittest.main()