import pytest
from question_selector import QuestionSelectionEngine

@pytest.fixture
def sample_questions():
    return [
        {"id": 1, "text": "What is 2+2?"},
        {"id": 2, "text": "What is the capital of France?"},
        {"id": 3, "text": "Who wrote Hamlet?"},
        {"id": 4, "text": "What is the boiling point of water?"},
        {"id": 5, "text": "What is the speed of light?"},
    ]

def test_select_correct_number_of_questions(sample_questions):
    engine = QuestionSelectionEngine(sample_questions)
    selected = engine.select_random_questions(3)
    assert len(selected) == 3

def test_selected_questions_are_unique(sample_questions):
    engine = QuestionSelectionEngine(sample_questions)
    selected = engine.select_random_questions(5)
    assert len(selected) == len(set(q["id"] for q in selected))

def test_select_zero_questions(sample_questions):
    engine = QuestionSelectionEngine(sample_questions)
    selected = engine.select_random_questions(0)
    assert len(selected) == 0

def test_select_more_than_available(sample_questions):
    engine = QuestionSelectionEngine(sample_questions)
    selected = engine.select_random_questions(10)
    assert len(selected) == len(sample_questions)
    assert len(selected) == len(set(q["id"] for q in selected))

def test_empty_pool():
    engine = QuestionSelectionEngine([])
    selected = engine.select_random_questions(3)
    assert len(selected) == 0

def test_negative_number_raises_error(sample_questions):
    engine = QuestionSelectionEngine(sample_questions)
    with pytest.raises(ValueError):
        engine.select_random_questions(-1)
