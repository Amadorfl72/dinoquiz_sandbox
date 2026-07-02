import pytest
import json
from trio_fsnd.question_engine import QuestionSelectionEngine

@pytest.fixture
def valid_bank(tmp_path):
    data = [{"id": i, "question": f"Question {i}", "answer": f"Answer {i}"} for i in range(1, 21)]
    file_path = tmp_path / "bank.json"
    with open(file_path, 'w') as f:
        json.dump(data, f)
    return file_path

@pytest.fixture
def insufficient_bank(tmp_path):
    data = [{"id": i, "question": f"Question {i}", "answer": f"Answer {i}"} for i in range(1, 6)]
    file_path = tmp_path / "small_bank.json"
    with open(file_path, 'w') as f:
        json.dump(data, f)
    return file_path

@pytest.fixture
def invalid_structure_bank(tmp_path):
    data = [{"id": 1, "question": "Question 1"}, {"id": 2, "answer": "Answer 2"}]
    file_path = tmp_path / "invalid_bank.json"
    with open(file_path, 'w') as f:
        json.dump(data, f)
    return file_path

@pytest.fixture
def malformed_json_bank(tmp_path):
    file_path = tmp_path / "malformed.json"
    with open(file_path, 'w') as f:
        f.write("{invalid json content")
    return file_path

def test_load_valid_bank(valid_bank):
    engine = QuestionSelectionEngine(str(valid_bank))
    assert engine.bank_size == 20

def test_invalid_json_format(malformed_json_bank):
    with pytest.raises(ValueError, match="Invalid JSON format"):
        QuestionSelectionEngine(str(malformed_json_bank))

def test_invalid_question_structure(invalid_structure_bank):
    with pytest.raises(ValueError, match="Invalid question structure"):
        QuestionSelectionEngine(str(invalid_structure_bank))

def test_select_10_questions(valid_bank):
    engine = QuestionSelectionEngine(str(valid_bank))
    selected = engine.select_questions()
    assert len(selected) == 10

def test_no_repetition(valid_bank):
    engine = QuestionSelectionEngine(str(valid_bank))
    selected = engine.select_questions()
    ids = [q["id"] for q in selected]
    assert len(ids) == len(set(ids))

def test_randomness(valid_bank):
    engine = QuestionSelectionEngine(str(valid_bank))
    selection1 = engine.select_questions()
    selection2 = engine.select_questions()
    ids1 = set(q["id"] for q in selection1)
    ids2 = set(q["id"] for q in selection2)
    assert ids1 != ids2

def test_insufficient_questions(insufficient_bank):
    engine = QuestionSelectionEngine(str(insufficient_bank))
    with pytest.raises(ValueError, match="Not enough questions"):
        engine.select_questions()