import pytest
from question_selector import QuestionSelector

@pytest.fixture
def sample_questions():
    return [
        {"id": 1, "text": "What is 2+2?"},
        {"id": 2, "text": "What is 3+3?"},
        {"id": 3, "text": "What is 4+4?"},
        {"id": 4, "text": "What is 5+5?"},
        {"id": 5, "text": "What is 6+6?"},
    ]

def test_select_correct_number(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(3)
    assert len(selected) == 3

def test_select_unique_questions(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(3)
    selected_ids = [q["id"] for q in selected]
    assert len(selected_ids) == len(set(selected_ids))

def test_select_from_empty_pool():
    selector = QuestionSelector([])
    selected = selector.select(3)
    assert selected == []

def test_select_more_than_available(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(10)
    assert len(selected) == len(sample_questions)
    assert all(q in sample_questions for q in selected)

def test_select_zero_questions(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(0)
    assert selected == []

def test_select_negative_questions(sample_questions):
    selector = QuestionSelector(sample_questions)
    with pytest.raises(ValueError):
        selector.select(-1)

def test_select_all_questions(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(len(sample_questions))
    assert len(selected) == len(sample_questions)
    assert all(q in sample_questions for q in selected)

def test_select_subset_of_original_pool(sample_questions):
    selector = QuestionSelector(sample_questions)
    selected = selector.select(2)
    assert all(q in sample_questions for q in selected)
