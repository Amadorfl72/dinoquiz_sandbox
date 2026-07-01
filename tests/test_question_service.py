import pytest
import json
from question_service import QuestionService, InvalidQuestionBankError

@pytest.fixture
def valid_bank(tmp_path):
    questions = [
        {"id": i, "text": f"Question {i}", "options": ["A", "B", "C", "D"], "answer": "A"}
        for i in range(1, 21)
    ]
    file_path = tmp_path / "bank.json"
    with open(file_path, "w") as f:
        json.dump(questions, f)
    return file_path

@pytest.fixture
def small_bank(tmp_path):
    questions = [
        {"id": i, "text": f"Question {i}", "options": ["A", "B", "C", "D"], "answer": "A"}
        for i in range(1, 6)
    ]
    file_path = tmp_path / "small_bank.json"
    with open(file_path, "w") as f:
        json.dump(questions, f)
    return file_path

@pytest.fixture
def invalid_json_bank(tmp_path):
    file_path = tmp_path / "invalid.json"
    with open(file_path, "w") as f:
        f.write("{invalid json}")
    return file_path

@pytest.fixture
def missing_fields_bank(tmp_path):
    questions = [{"id": 1, "text": "Question 1"}]
    file_path = tmp_path / "missing.json"
    with open(file_path, "w") as f:
        json.dump(questions, f)
    return file_path

def test_loads_and_validates_valid_bank_on_startup(valid_bank):
    service = QuestionService(str(valid_bank))
    assert len(service.questions) == 20

def test_invalid_json_format_raises_error_on_startup(invalid_json_bank):
    with pytest.raises(InvalidQuestionBankError):
        QuestionService(str(invalid_json_bank))

def test_missing_required_fields_raises_error_on_startup(missing_fields_bank):
    with pytest.raises(InvalidQuestionBankError):
        QuestionService(str(missing_fields_bank))

def test_selects_exactly_10_questions(valid_bank):
    service = QuestionService(str(valid_bank))
    selected = service.get_random_questions()
    assert len(selected) == 10

def test_no_repetition_in_selected_questions(valid_bank):
    service = QuestionService(str(valid_bank))
    selected = service.get_random_questions()
    ids = [q["id"] for q in selected]
    assert len(ids) == len(set(ids))

def test_raises_error_if_bank_has_fewer_than_10_questions(small_bank):
    service = QuestionService(str(small_bank))
    with pytest.raises(ValueError):
        service.get_random_questions()

def test_random_selection_returns_different_orders(valid_bank):
    service = QuestionService(str(valid_bank))
    selected1 = service.get_random_questions()
    selected2 = service.get_random_questions()
    
    ids1 = [q["id"] for q in selected1]
    ids2 = [q["id"] for q in selected2]
    
    # Extremely unlikely to be identical if truly random
    assert ids1 != ids2
