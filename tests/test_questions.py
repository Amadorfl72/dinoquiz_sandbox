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
        assert isinstance(text, str) and len(text.strip()) > 0, f"Question {i+1} fun_fact text is empty."


def test_fun_fact_image_path_is_valid_string(questions_data):
    for i, question in enumerate(questions_data):
        image_path = question.get("fun_fact", {}).get("image_path", "")
        assert isinstance(image_path, str) and len(image_path.strip()) > 0, f"Question {i+1} fun_fact image_path is invalid."


def test_fun_fact_text_vocabulary_is_simple(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        words = text.split()
        for word in words:
            clean_word = word.strip(".,!?;:\"'()[]{}")
            # Allow dinosaur names and other proper nouns up to 18 chars
            assert len(clean_word) <= 18, f"Question {i+1} fun_fact contains a potentially complex word: '{clean_word}'"
        assert len(text) <= 300, f"Question {i+1} fun_fact text is too long for a 6-9 year old."


def test_fun_fact_text_is_unique(questions_data):
    texts = [question.get("fun_fact", {}).get("text", "") for question in questions_data]
    assert len(set(texts)) == len(texts), "All fun_fact texts should be unique."


def test_fun_fact_image_path_is_unique(questions_data):
    paths = [question.get("fun_fact", {}).get("image_path", "") for question in questions_data]
    assert len(set(paths)) == len(paths), "All fun_fact image_paths should be unique."


def test_fun_fact_text_ends_with_punctuation(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "").strip()
        assert text[-1] in ".!?", f"Question {i+1} fun_fact text should end with proper punctuation."


def test_fun_fact_has_no_extra_keys(questions_data):
    allowed_keys = {"text", "image_path"}
    for i, question in enumerate(questions_data):
        fun_fact = question.get("fun_fact", {})
        actual_keys = set(fun_fact.keys())
        assert actual_keys.issubset(allowed_keys), f"Question {i+1} fun_fact has unexpected keys: {actual_keys - allowed_keys}"


def test_fun_fact_text_no_urls_or_html(questions_data):
    url_pattern = re.compile(r'https?://.+')
    html_tag_pattern = re.compile(r'<[^>]+>')
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        assert not url_pattern.search(text), f"Question {i+1} fun_fact text contains a URL."
        assert not html_tag_pattern.search(text), f"Question {i+1} fun_fact text contains HTML tags."


def test_fun_fact_text_max_sentences(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
        assert len(sentences) <= 3, f"Question {i+1} fun_fact text has more than 3 sentences."


def test_image_path_has_valid_extension(questions_data):
    valid_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    for i, question in enumerate(questions_data):
        image_path = question.get("fun_fact", {}).get("image_path", "")
        ext = os.path.splitext(image_path)[1].lower()
        assert ext in valid_extensions, f"Question {i+1} fun_fact image_path has invalid extension '{ext}'."


def test_image_path_has_valid_prefix(questions_data):
    for i, question in enumerate(questions_data):
        image_path = question.get("fun_fact", {}).get("image_path", "")
        valid_start = (image_path.startswith('/') or
                       image_path.startswith('./') or
                       image_path.startswith('assets/') or
                       image_path.startswith('images/'))
        assert valid_start, f"Question {i+1} fun_fact image_path '{image_path}' has an invalid prefix."


def test_fun_fact_text_min_length(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "").strip()
        assert len(text) >= 10, f"Question {i+1} fun_fact text is too short (less than 10 characters)."


def test_fun_fact_text_no_inappropriate_language(questions_data):
    inappropriate_words = [
        'violence', 'violent', 'kill', 'killed', 'killing', 'murder',
        'blood', 'gore', 'weapon', 'gun', 'drugs', 'alcohol',
        'drunk', 'sex', 'sexual', 'profanity', 'damn', 'hell',
        'stupid', 'hate', 'death', 'dead', 'die', 'died', 'dying',
        'war', 'fight', 'fighting', 'attack', 'attacked',
        'terror', 'terrorist', 'bomb', 'shoot', 'shot',
        'abuse', 'abused', 'crime', 'criminal', 'prison',
        'drug', 'beer', 'wine', 'liquor', 'cigarette', 'smoke', 'smoking'
    ]
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "").lower()
        for word in inappropriate_words:
            assert word not in text, f"Question {i+1} fun_fact text contains inappropriate word: '{word}'."


def test_fun_fact_text_avg_word_length(questions_data):
    for i, question in enumerate(questions_data):
        text = question.get("fun_fact", {}).get("text", "")
        words = [w for w in text.split() if len(w) > 0]
        total_chars = sum(len(w) for w in words)
        avg_word_length = total_chars / len(words) if words else 0
        assert avg_word_length <= 8, f"Question {i+1} fun_fact text average word length is too high ({avg_word_length:.1f})."


def test_each_question_has_question_property(questions_data):
    for i, question in enumerate(questions_data):
        has_question = ('question' in question or
                        'prompt' in question or
                        'text' in question)
        assert has_question, f"Question {i+1} is missing a question/prompt/text property."


def test_no_fun_fact_text_duplicates_question_text(questions_data):
    question_texts = []
    for q in questions_data:
        qt = q.get('question', q.get('prompt', q.get('text', '')))
        question_texts.append(qt.lower().strip())
    for i, question in enumerate(questions_data):
        fact_text = question.get("fun_fact", {}).get("text", "").lower().strip()
        assert fact_text not in question_texts, f"Question {i+1} fun_fact text duplicates a question text."
