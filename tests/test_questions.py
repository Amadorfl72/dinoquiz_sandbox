import json
import os
import pytest

QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'questions.json')

@pytest.fixture(scope='module')
def questions_data():
    if not os.path.exists(QUESTIONS_FILE):
        pytest.fail(f"{QUESTIONS_FILE} not found.")
    with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def test_questions_count_is_30(questions_data):
    assert len(questions_data) == 30, "There should be exactly 30 questions."

def test_each_question_has_fun_fact(questions_data):
    for i, question in enumerate(questions_data):
        assert "fun_fact" in question, f"Question {i+1} is missing the 'fun_fact' object."
        assert isinstance(question["fun_fact"], dict), f"Question {i+1} 'fun_fact' should be an object."

def test_fun_fact_has_text_and_image_path(questions_data):
    for i, question in enumerate(questions_data):
        fun_fact = question.get("fun_fact", {})
        assert "text" in fun_fact, f"Question {i+1} fun_fact is missing 'text'."
        assert "image_path" in fun_fact, f"Question {i+1} fun_fact is missing 'image_path'."

def test_fun_fact_text_is_not_empty(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        assert isinstance(text, str) and len(text) > 0, f"Question {i+1} fun_fact text is empty."

def test_fun_fact_image_path_is_valid_string(questions_data):
    for i, question in enumerate(questions_data):
        image_path = question.get("fun_fact", {}).get("image_path", "")
        assert isinstance(image_path, str) and len(image_path) > 0, f"Question {i+1} fun_fact image_path is invalid."

def test_fun_fact_text_vocabulary_is_simple(questions_data):
    # Heuristic for 6-9 years: words shouldn't be too long, text shouldn't be too long
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        words = text.split()
        for word in words:
            # Remove basic punctuation
            clean_word = word.strip(".,!?;:\"'()[]{}")
            assert len(clean_word) <= 12, f"Question {i+1} fun_fact contains a potentially complex word: '{clean_word}'"
        assert len(text) <= 200, f"Question {i+1} fun_fact text is too long for a 6-9 year old."
