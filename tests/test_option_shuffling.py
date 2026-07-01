import pytest
from unittest.mock import patch
from app.services.question_service import shuffle_options

def test_shuffle_options_returns_list():
    options = ["Option 1", "Option 2", "Option 3"]
    result = shuffle_options(options)
    assert isinstance(result, list)

def test_shuffle_options_preserves_all_elements():
    options = ["Option 1", "Option 2", "Option 3"]
    result = shuffle_options(options)
    assert len(result) == 3
    assert set(result) == set(options)

def test_shuffle_options_randomizes_order():
    options = ["Option 1", "Option 2", "Option 3"]
    permutations_seen = set()
    
    for _ in range(100):
        result = shuffle_options(options)
        permutations_seen.add(tuple(result))
        
    # Since there are 6 possible permutations of 3 items, 
    # we expect to see more than one over 100 iterations.
    assert len(permutations_seen) > 1

def test_shuffle_options_does_not_mutate_input():
    options = ["Option 1", "Option 2", "Option 3"]
    original_options = list(options)
    
    shuffle_options(options)
    
    assert options == original_options

def test_shuffle_options_handles_empty_list():
    options = []
    result = shuffle_options(options)
    assert result == []

def test_shuffle_options_handles_single_option():
    options = ["Only Option"]
    result = shuffle_options(options)
    assert result == ["Only Option"]
