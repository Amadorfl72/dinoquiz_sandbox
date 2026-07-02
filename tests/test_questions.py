import json
import os
import pytest


# Load questions from JSON file
QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'questions.json')

with open(QUESTIONS_FILE, 'r') as file:
    questions = json.load(file)['questions']


def test_questions_loaded():
    assert questions is not None
    assert isinstance(questions, list)
    assert len(questions) > 0


def test_has_30_questions():
    assert len(questions) == 30, f"Expected 30 questions, got {len(questions)}"


def test_fun_fact_image_path_is_unique():
    """All fun_fact image_paths should be unique."""
    image_paths = [q['image_path'] for q in questions]
    unique_image_paths = set(image_paths)
    assert len(unique_image_paths) == len(image_paths), \
        f"Duplicate fun_fact image_paths found. {len(image_paths)} total, {len(unique_image_paths)} unique."


def test_every_question_has_image_path():
    for i, q in enumerate(questions):
        assert 'image_path' in q, f"Question at index {i} is missing image_path"
        assert isinstance(q['image_path'], str), f"Question at index {i} has non-string image_path"
        assert len(q['image_path']) > 0, f"Question at index {i} has empty image_path"


def test_every_question_has_fun_fact():
    for i, q in enumerate(questions):
        assert 'fun_fact' in q, f"Question at index {i} is missing fun_fact"
        assert isinstance(q['fun_fact'], str), f"Question at index {i} has non-string fun_fact"
        assert len(q['fun_fact']) > 0, f"Question at index {i} has empty fun_fact"


def test_question_ids_are_unique():
    ids = [q['id'] for q in questions]
    unique_ids = set(ids)
    assert len(unique_ids) == len(ids), "Duplicate question ids found."


def test_image_paths_no_duplicates_explicit():
    """Explicitly check for known duplicate patterns from the bug report."""
    image_paths = [q['image_path'] for q in questions]
    duplicates = [p for p in image_paths if image_paths.count(p) > 1]
    assert len(duplicates) == 0, f"Duplicate image_paths found: {set(duplicates)}"


def test_required_fields_present():
    required_fields = ['id', 'question', 'options', 'correct_answer', 'fun_fact', 'image_path']
    for i, q in enumerate(questions):
        for field in required_fields:
            assert field in q, f"Question at index {i} is missing required field: {field}"


def test_options_are_lists():
    for i, q in enumerate(questions):
        assert isinstance(q['options'], list), f"Question at index {i} options is not a list"
        assert len(q['options']) >= 2, f"Question at index {i} has fewer than 2 options"


def test_correct_answer_in_options():
    for i, q in enumerate(questions):
        assert q['correct_answer'] in q['options'], \
            f"Question at index {i} correct_answer not in options"
