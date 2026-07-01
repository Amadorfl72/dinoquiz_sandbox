import pytest
from question_selector import RandomQuestionSelector

@pytest.fixture
def sample_questions():
    return [
        {"id": 1, "text": "What is 2+2?"},
        {"id": 2, "text": "What is the capital of France?"},
        {"id": 3, "text": "Who wrote Hamlet?"},
        {"id": 4, "text": "What is the boiling point of water?"},
        {"id": 5, "text": "What is the speed of light?"}
    ]

def test_initialization_with_empty_list():
    with pytest.raises(ValueError):
        RandomQuestionSelector([])

def test_select_one_returns_valid_question(sample_questions):
    selector = RandomQuestionSelector(sample_questions)
    question = selector.select_one()
    assert question in sample_questions

def test_select_many_returns_correct_count(sample_questions):
    selector = RandomQuestionSelector(sample_questions)
    selected = selector.select_many(3)
    assert len(selected) == 3
    for q in selected:
        assert q in sample_questions

def test_select_unique_returns_unique_questions(sample_questions):
    selector = RandomQuestionSelector(sample_questions)
    selected = selector.select_unique(3)
    assert len(selected) == 3
    assert len(set(q["id"] for q in selected)) == 3

def test_select_unique_more_than_available_raises_error(sample_questions):
    selector = RandomQuestionSelector(sample_questions)
    with pytest.raises(ValueError):
        selector.select_unique(6)
