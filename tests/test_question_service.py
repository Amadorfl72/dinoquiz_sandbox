import pytest
import json
from unittest.mock import patch
from question_service import QuestionService, QuestionBankValidationError

VALID_BANK = [
    {"id": i, "text": f"Question {i}", "options": ["A", "B", "C"], "answer": "A"}
    for i in range(1, 16)
]

INVALID_JSON_CONTENT = "{'id': 1, 'text': 'Question 1'}"

MISSING_FIELD_BANK = [
    {"id": 1, "text": "Question 1", "options": ["A", "B", "C"], "answer": "A"},
    {"id": 2, "text": "Question 2", "options": ["A", "B", "C"]}
]

FEW_QUESTIONS_BANK = [
    {"id": 1, "text": "Question 1", "options": ["A", "B", "C"], "answer": "A"},
    {"id": 2, "text": "Question 2", "options": ["A", "B", "C"], "answer": "B"}
]

@pytest.fixture
def valid_bank_file(tmp_path):
    file = tmp_path / "valid_bank.json"
    file.write_text(json.dumps(VALID_BANK))
    return str(file)

@pytest.fixture
def invalid_json_file(tmp_path):
    file = tmp_path / "invalid.json"
    file.write_text(INVALID_JSON_CONTENT)
    return str(file)

@pytest.fixture
def missing_field_file(tmp_path):
    file = tmp_path / "missing_field.json"
    file.write_text(json.dumps(MISSING_FIELD_BANK))
    return str(file)

@pytest.fixture
def few_questions_file(tmp_path):
    file = tmp_path / "few_questions.json"
    file.write_text(json.dumps(FEW_QUESTIONS_BANK))
    return str(file)

def test_loads_and_validates_valid_bank(valid_bank_file):
    service = QuestionService(valid_bank_file)
    assert service.is_loaded() is True

def test_raises_error_on_invalid_json(invalid_json_file):
    with pytest.raises(QuestionBankValidationError):
        QuestionService(invalid_json_file)

def test_raises_error_on_missing_fields(missing_field_file):
    with pytest.raises(QuestionBankValidationError):
        QuestionService(missing_field_file)

def test_selects_exactly_10_questions(valid_bank_file):
    service = QuestionService(valid_bank_file)
    questions = service.get_random_questions()
    assert len(questions) == 10

def test_selected_questions_are_unique(valid_bank_file):
    service = QuestionService(valid_bank_file)
    questions = service.get_random_questions()
    ids = [q["id"] for q in questions]
    assert len(ids) == len(set(ids))

def test_raises_error_when_not_enough_questions(few_questions_file):
    service = QuestionService(few_questions_file)
    with pytest.raises(ValueError):
        service.get_random_questions()

def test_random_selection_uses_random_sample(valid_bank_file):
    with patch('random.sample') as mock_sample:
        mock_sample.return_value = VALID_BANK[:10]
        service = QuestionService(valid_bank_file)
        service.get_random_questions()
        mock_sample.assert_called_once()