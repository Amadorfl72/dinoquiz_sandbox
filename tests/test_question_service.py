import pytest
import json
from unittest.mock import patch
from question_service import QuestionService

@pytest.fixture
def valid_bank():
    return [{"id": i, "question": f"Question {i}", "answer": f"Answer {i}"} for i in range(1, 21)]

@pytest.fixture
def valid_bank_file(tmp_path, valid_bank):
    file_path = tmp_path / "bank.json"
    with open(file_path, 'w') as f:
        json.dump(valid_bank, f)
    return str(file_path)

@pytest.fixture
def small_bank_file(tmp_path):
    questions = [{"id": i, "question": f"Question {i}", "answer": f"Answer {i}"} for i in range(1, 6)]
    file_path = tmp_path / "small_bank.json"
    with open(file_path, 'w') as f:
        json.dump(questions, f)
    return str(file_path)

@pytest.fixture
def invalid_json_file(tmp_path):
    file_path = tmp_path / "invalid.json"
    with open(file_path, 'w') as f:
        f.write("{invalid json: }")
    return str(file_path)

@pytest.fixture
def missing_fields_file(tmp_path):
    questions = [{"id": 1, "question": "Question 1"}]
    file_path = tmp_path / "missing_fields.json"
    with open(file_path, 'w') as f:
        json.dump(questions, f)
    return str(file_path)

def test_load_valid_json_bank(valid_bank_file):
    service = QuestionService(valid_bank_file)
    assert service is not None

def test_invalid_json_raises_error(invalid_json_file):
    with pytest.raises(ValueError):
        QuestionService(invalid_json_file)

def test_missing_fields_raises_error(missing_fields_file):
    with pytest.raises(ValueError):
        QuestionService(missing_fields_file)

def test_select_exactly_10_questions(valid_bank_file):
    service = QuestionService(valid_bank_file)
    session_questions = service.get_session_questions()
    assert len(session_questions) == 10

def test_no_repetition_in_selection(valid_bank_file):
    service = QuestionService(valid_bank_file)
    session_questions = service.get_session_questions()
    ids = [q["id"] for q in session_questions]
    assert len(ids) == len(set(ids))

def test_not_enough_questions_raises_error(small_bank_file):
    with pytest.raises(ValueError):
        QuestionService(small_bank_file)

def test_randomness_of_selection(valid_bank_file):
    service = QuestionService(valid_bank_file)
    with patch('random.sample') as mock_sample:
        mock_sample.return_value = [{"id": i} for i in range(10)]
        service.get_session_questions()
        mock_sample.assert_called_once()

def test_session_questions_are_from_bank(valid_bank_file, valid_bank):
    service = QuestionService(valid_bank_file)
    session_questions = service.get_session_questions()
    bank_ids = {q["id"] for q in valid_bank}
    for q in session_questions:
        assert q["id"] in bank_ids