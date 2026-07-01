import pytest
from unittest.mock import patch
from question_service import shuffle_options

def test_shuffle_options_preserves_elements():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 1
    
    shuffled, new_correct_index = shuffle_options(options, correct_index)
    
    assert set(shuffled) == set(options)

def test_shuffle_options_length_is_three():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 0
    
    shuffled, new_correct_index = shuffle_options(options, correct_index)
    
    assert len(shuffled) == 3

def test_shuffle_options_does_not_mutate_original():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 0
    original_options_copy = list(options)
    
    shuffled, new_correct_index = shuffle_options(options, correct_index)
    
    assert options == original_options_copy

def test_shuffle_options_updates_correct_index_when_moved():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 0
    
    # Mock random.shuffle to move the first element to the end
    def mock_shuffle(lst):
        lst.append(lst.pop(0))
        
    with patch('question_service.random.shuffle', side_effect=mock_shuffle):
        shuffled, new_correct_index = shuffle_options(options, correct_index)
        
    assert shuffled == ["Option B", "Option C", "Option A"]
    assert new_correct_index == 2

def test_shuffle_options_updates_correct_index_when_reversed():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 1
    
    # Mock random.shuffle to reverse the list
    def mock_shuffle(lst):
        lst.reverse()
        
    with patch('question_service.random.shuffle', side_effect=mock_shuffle):
        shuffled, new_correct_index = shuffle_options(options, correct_index)
        
    assert shuffled == ["Option C", "Option B", "Option A"]
    assert new_correct_index == 1

def test_shuffle_options_randomizes_order():
    options = ["Option A", "Option B", "Option C"]
    correct_index = 0
    
    # Run multiple times to ensure it doesn't just return the original order
    # (Mocking ensures deterministic behavior, but this checks the actual random call)
    orders_seen = set()
    
    for _ in range(10):
        shuffled, _ = shuffle_options(options, correct_index)
        orders_seen.add(tuple(shuffled))
        
    assert len(orders_seen) > 1
