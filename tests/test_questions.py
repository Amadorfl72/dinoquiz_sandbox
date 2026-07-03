import json
import os
import re
import pytest

QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'questions.json')

@pytest.fixture(scope='module')
def questions_data():
    if not os.path.exists(QUESTIONS_FILE):
        pytest.fail(f"{QUESTIONS_FILE} not found.")
    with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

[... rest of the test file with complete inappropriate_words list ...]