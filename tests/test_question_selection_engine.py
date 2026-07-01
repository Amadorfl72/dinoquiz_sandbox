import pytest
import random

# Assuming the implementation is in src/question_engine.py
from src.question_engine import QuestionSelectionEngine

@pytest.fixture
def sample_questions():
    return [
        "What is your favorite color?",
        "What is the capital of France?",
        "How many planets are in the solar system?",
        "Who wrote 'To Kill a Mockingbird'?",
        "What is the boiling point of water?"
    ]

@pytest.fixture
def engine(sample_questions):
    return QuestionSelectionEngine(sample_questions)

def test_initialization(engine, sample_questions):
    assert engine.questions == sample_questions

def test_select_single_question(engine, sample_questions):
    selected = engine.select(1)
    assert len(selected) == 1
    assert selected[0] in sample_questions

def test_select_multiple_questions(engine, sample_questions):
    selected = engine.select(3)
    assert len(selected) == 3
    for question in selected:
        assert question in sample_questions

def test_no_duplicates_in_selection(engine, sample_questions):
    selected = engine.select(len(sample_questions))
    assert len(selected) == len(sample_questions)
    assert len(set(selected)) == len(sample_questions)

def test_select_all_questions(engine, sample_questions):
    selected = engine.select(len(sample_questions))
    assert sorted(selected) == sorted(sample_questions)

def test_select_more_than_available_raises_error(engine, sample_questions):
    with pytest.raises(ValueError):
        engine.select(len(sample_questions) + 1)

def test_select_zero_questions(engine):
    selected = engine.select(0)
    assert selected == []

def test_empty_pool_initialization():
    with pytest.raises(ValueError):
        QuestionSelectionEngine([])

def test_randomness_of_selection(engine, sample_questions):
    # Run selection multiple times and ensure we get different results
    # (highly probable with a large enough pool and multiple runs)
    results = set()
    for _ in range(100):
        selected = engine.select(1)
        results.add(selected[0])
    # With 5 questions, selecting 100 times should yield more than 1 unique question
    assert len(results) > 1

def test_seed_reproducibility(sample_questions):
    engine1 = QuestionSelectionEngine(sample_questions)
    engine2 = QuestionSelectionEngine(sample_questions)
    
    random.seed(42)
    selected1 = engine1.select(3)
    
    random.seed(42)
    selected2 = engine2.select(3)
    
    assert selected1 == selected2
