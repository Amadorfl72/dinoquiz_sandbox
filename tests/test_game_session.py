import pytest
from game_session import GameSession

@pytest.fixture
def sample_questions():
    return [{"id": i, "text": f"Question {i}"} for i in range(1, 11)]

@pytest.fixture
def game_session(sample_questions):
    return GameSession(sample_questions)

def test_initialization(game_session, sample_questions):
    assert len(game_session.questions) == 10
    assert game_session.current_index == 0
    assert game_session.get_current_question() == sample_questions[0]

def test_next_question_transition(game_session, sample_questions):
    q1 = game_session.get_current_question()
    q2 = game_session.next_question()
    assert q1 != q2
    assert game_session.current_index == 1
    assert q2 == sample_questions[1]

def test_no_repeat_on_transitions(game_session):
    asked_questions = set()
    
    for _ in range(10):
        current = game_session.get_current_question()
        assert current["id"] not in asked_questions
        asked_questions.add(current["id"])
        if not game_session.is_finished():
            game_session.next_question()

def test_is_finished(game_session):
    assert not game_session.is_finished()
    for _ in range(9):
        game_session.next_question()
    assert not game_session.is_finished()
    game_session.next_question()
    assert game_session.is_finished()

def test_next_question_at_end_raises_error(game_session):
    for _ in range(9):
        game_session.next_question()
    
    with pytest.raises(Exception):
        game_session.next_question()
