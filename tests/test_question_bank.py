import json
import os
from collections import Counter

import pytest

QUESTION_BANK_FILE = "question_bank.json"

@pytest.fixture(scope="module")
def question_bank():
    assert os.path.exists(QUESTION_BANK_FILE), f"{QUESTION_BANK_FILE} not found in the repository"
    with open(QUESTION_BANK_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def test_question_bank_file_exists():
    assert os.path.exists(QUESTION_BANK_FILE), "No JSON file found in the repository matching the expected question bank file name"

def test_contains_exactly_40_questions(question_bank):
    assert isinstance(question_bank, list), "Question bank should be a list of questions"
    assert len(question_bank) == 40, f"Expected 40 questions, got {len(question_bank)}"

def test_each_question_has_statement(question_bank):
    for i, q in enumerate(question_bank):
        assert "statement" in q, f"Question {i} missing 'statement'"
        assert isinstance(q["statement"], str) and len(q["statement"]) > 0, f"Question {i} 'statement' is empty"

def test_each_question_has_3_to_4_options(question_bank):
    for i, q in enumerate(question_bank):
        assert "options" in q, f"Question {i} missing 'options'"
        assert isinstance(q["options"], list), f"Question {i} 'options' should be a list"
        assert 3 <= len(q["options"]) <= 4, f"Question {i} has {len(q['options'])} options, expected 3-4"

def test_each_question_has_correct_answer(question_bank):
    for i, q in enumerate(question_bank):
        assert "correct_answer" in q, f"Question {i} missing 'correct_answer'"
        if isinstance(q["correct_answer"], int):
            assert 0 <= q["correct_answer"] < len(q["options"]), f"Question {i} correct_answer index out of bounds"
        elif isinstance(q["correct_answer"], str):
            assert q["correct_answer"] in q["options"], f"Question {i} correct_answer not in options"
        else:
            pytest.fail(f"Question {i} correct_answer is of invalid type")

def test_each_question_has_fun_fact(question_bank):
    for i, q in enumerate(question_bank):
        assert "fun_fact" in q, f"Question {i} missing 'fun_fact'"
        assert isinstance(q["fun_fact"], str) and len(q["fun_fact"]) > 0, f"Question {i} 'fun_fact' is empty"

def test_each_question_has_image_reference(question_bank):
    for i, q in enumerate(question_bank):
        assert "image" in q, f"Question {i} missing 'image' reference"
        assert isinstance(q["image"], str) and len(q["image"]) > 0, f"Question {i} 'image' is empty"

def test_at_least_3_questions_per_dinosaur_species(question_bank):
    species_counter = Counter()
    for i, q in enumerate(question_bank):
        species = q.get("species") or q.get("dinosaur")
        assert species is not None, f"Question {i} missing 'species' or 'dinosaur' field"
        species_counter[species] += 1
    
    for species, count in species_counter.items():
        assert count >= 3, f"Species '{species}' has only {count} questions, expected at least 3"
