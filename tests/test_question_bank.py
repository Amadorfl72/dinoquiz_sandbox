import json
import os
from collections import Counter

import pytest

QUESTION_BANK_FILE = os.path.join("src", "assets", "questions.json")


@pytest.fixture(scope="module")
def question_bank():
    assert os.path.exists(QUESTION_BANK_FILE), f"{QUESTION_BANK_FILE} not found in the repository"
    with open(QUESTION_BANK_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data


def test_question_bank_file_exists():
    """TRIOFSND-57: should have a local JSON file for the question bank."""
    assert os.path.exists(QUESTION_BANK_FILE), \
        "No JSON file found in the repository matching the expected question bank file name"


def test_question_bank_is_valid_json(question_bank):
    """TRIOFSND-57: the question bank file should be valid JSON."""
    assert isinstance(question_bank, list), "Question bank should be a JSON array of questions"


def test_contains_exactly_40_questions(question_bank):
    """TRIOFSND-57: should contain exactly 40 questions."""
    assert isinstance(question_bank, list), "Question bank should be a list of questions"
    assert len(question_bank) == 40, f"Expected 40 questions, got {len(question_bank)}"


def test_each_question_has_statement(question_bank):
    """TRIOFSND-57: each question should have a statement."""
    for i, q in enumerate(question_bank):
        assert "statement" in q, f"Question {i} missing 'statement'"
        assert isinstance(q["statement"], str), f"Question {i} 'statement' should be a string"
        assert len(q["statement"].strip()) > 0, f"Question {i} 'statement' is empty"


def test_each_question_has_3_to_4_options(question_bank):
    """TRIOFSND-57: each question should have 3-4 options."""
    for i, q in enumerate(question_bank):
        assert "options" in q, f"Question {i} missing 'options'"
        assert isinstance(q["options"], list), f"Question {i} 'options' should be a list"
        assert 3 <= len(q["options"]) <= 4, \
            f"Question {i} has {len(q['options'])} options, expected 3-4"
        for j, opt in enumerate(q["options"]):
            assert isinstance(opt, str) and len(opt.strip()) > 0, \
                f"Question {i} option {j} is empty or not a string"


def test_each_question_has_correct_answer(question_bank):
    """TRIOFSND-57: each question should have a correct answer."""
    for i, q in enumerate(question_bank):
        assert "correctAnswer" in q, f"Question {i} missing 'correctAnswer'"
        if isinstance(q["correctAnswer"], int):
            assert 0 <= q["correctAnswer"] < len(q["options"]), \
                f"Question {i} correctAnswer index out of bounds"
        elif isinstance(q["correctAnswer"], str):
            assert q["correctAnswer"] in q["options"], \
                f"Question {i} correctAnswer '{q['correctAnswer']}' not in options"
        else:
            pytest.fail(f"Question {i} correctAnswer is of invalid type: {type(q['correctAnswer'])}")


def test_each_question_has_fun_fact(question_bank):
    """TRIOFSND-57: each question should have a fun fact."""
    for i, q in enumerate(question_bank):
        assert "funFact" in q, f"Question {i} missing 'funFact'"
        assert isinstance(q["funFact"], str), f"Question {i} 'funFact' should be a string"
        assert len(q["funFact"].strip()) > 0, f"Question {i} 'funFact' is empty"


def test_each_question_has_image_reference(question_bank):
    """TRIOFSND-57: each question should have an image reference."""
    for i, q in enumerate(question_bank):
        assert "imageRef" in q, f"Question {i} missing 'imageRef' reference"
        assert isinstance(q["imageRef"], str), f"Question {i} 'imageRef' should be a string"
        assert len(q["imageRef"].strip()) > 0, f"Question {i} 'imageRef' is empty"


def test_each_question_has_species(question_bank):
    """TRIOFSND-57: each question should have a species field for grouping."""
    for i, q in enumerate(question_bank):
        assert "species" in q, f"Question {i} missing 'species'"
        assert isinstance(q["species"], str), f"Question {i} 'species' should be a string"
        assert len(q["species"].strip()) > 0, f"Question {i} 'species' is empty"


def test_at_least_3_questions_per_dinosaur_species(question_bank):
    """TRIOFSND-57: should have >=3 questions per dinosaur species."""
    species_counter = Counter()
    for i, q in enumerate(question_bank):
        species = q.get("species")
        assert species is not None, f"Question {i} missing 'species' field"
        species_counter[species] += 1

    assert len(species_counter) > 0, "No species found in question bank"

    for species, count in species_counter.items():
        assert count >= 3, \
            f"Species '{species}' has only {count} questions, expected at least 3"


def test_question_ids_are_unique(question_bank):
    """TRIOFSND-57: each question should have a unique id."""
    ids = [q.get("id") for q in question_bank]
    for i, qid in enumerate(ids):
        assert qid is not None, f"Question {i} missing 'id'"
    assert len(ids) == len(set(ids)), "Question ids are not unique"
