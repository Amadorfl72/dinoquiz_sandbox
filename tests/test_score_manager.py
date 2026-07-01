import pytest
from unittest.mock import patch

# Assuming the implementation is in score_manager.py
# and depends on a 'safe_wrapper' module and an 'event_trigger' module.
from score_manager import handle_game_completion

@pytest.fixture
def mock_safe_wrapper():
    with patch('score_manager.safe_wrapper') as mock:
        yield mock

@pytest.fixture
def mock_event_trigger():
    with patch('score_manager.event_trigger') as mock:
        yield mock

def test_update_best_score_when_new_score_is_greater(mock_safe_wrapper, mock_event_trigger):
    # Arrange
    mock_safe_wrapper.get_best_score.return_value = 100
    new_score = 150

    # Act
    handle_game_completion(new_score)

    # Assert
    mock_safe_wrapper.get_best_score.assert_called_once()
    mock_safe_wrapper.update_best_score.assert_called_once_with(new_score)
    mock_event_trigger.trigger_ui_feedback.assert_called_once()

def test_do_nothing_when_new_score_is_equal(mock_safe_wrapper, mock_event_trigger):
    # Arrange
    mock_safe_wrapper.get_best_score.return_value = 100
    new_score = 100

    # Act
    handle_game_completion(new_score)

    # Assert
    mock_safe_wrapper.get_best_score.assert_called_once()
    mock_safe_wrapper.update_best_score.assert_not_called()
    mock_event_trigger.trigger_ui_feedback.assert_not_called()

def test_do_nothing_when_new_score_is_lower(mock_safe_wrapper, mock_event_trigger):
    # Arrange
    mock_safe_wrapper.get_best_score.return_value = 100
    new_score = 50

    # Act
    handle_game_completion(new_score)

    # Assert
    mock_safe_wrapper.get_best_score.assert_called_once()
    mock_safe_wrapper.update_best_score.assert_not_called()
    mock_event_trigger.trigger_ui_feedback.assert_not_called()

def test_get_best_score_is_retrieved(mock_safe_wrapper, mock_event_trigger):
    # Arrange
    mock_safe_wrapper.get_best_score.return_value = 200

    # Act
    handle_game_completion(150)

    # Assert
    mock_safe_wrapper.get_best_score.assert_called_once()
    mock_safe_wrapper.update_best_score.assert_not_called()
    mock_event_trigger.trigger_ui_feedback.assert_not_called()
