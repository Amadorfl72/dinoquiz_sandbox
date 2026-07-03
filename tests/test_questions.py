import json
import os
import re
import pytest

QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'questions.json')

INAPPROPRIATE_WORDS = [
    'violence', 'violent', 'kill', 'killed', 'kills', 'killing',
    'blood', 'bloody', 'death', 'dead', 'die', 'died', 'dies', 'dying',
    'murder', 'murderer', 'murdered', 'weapon', 'weapons', 'gun', 'guns',
    'knife', 'knives', 'bomb', 'bombs', 'war', 'wars', 'fight', 'fighting',
    'fights', 'fought', 'hate', 'hated', 'hates', 'stupid', 'idiot',
    'idiots', 'dumb', 'drugs', 'drug', 'alcohol', 'beer', 'wine',
    'cigarette', 'cigarettes', 'smoke', 'smoking', 'hell', 'damn', 'crap',
    'sexy', 'naked', 'nude', 'nudes', 'sex', 'sexual', 'terrorist',
    'terrorism', 'shoot', 'shooting', 'shoots', 'shot', 'stab', 'stabbing',
    'stabs', 'poison', 'poisoned', 'poisons', 'torture', 'tortured',
    'tortures', 'cruel', 'cruelty', 'evil', 'demon', 'devil', 'satan',
    'curse', 'cursed', 'curses', 'swear', 'swearing', 'swears',
    'assault', 'attack', 'attacked', 'attacks', 'abuse', 'abused',
    'abuses', 'abusive', 'racist', 'racism', 'sexist', 'sexism'
]

VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
VALID_IMAGE_PREFIXES = ('/', './', 'assets/', 'images/')


@pytest.fixture(scope='module')
def questions_data():
    if not os.path.exists(QUESTIONS_FILE):
        pytest.fail(f"{QUESTIONS_FILE} not found.")
    with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data


@pytest.fixture(scope='module')
def questions(questions_data):
    if isinstance(questions_data, list):
        return questions_data
    return questions_data.get('questions', [])


def test_questions_file_exists():
    assert os.path.exists(QUESTIONS_FILE), f"{QUESTIONS_FILE} not found."


def test_questions_file_is_valid_json(questions_data):
    assert questions_data is not None


def test_there_are_exactly_30_questions(questions):
    assert len(questions) == 30


def test_each_question_has_fun_fact_object(questions):
    for idx, q in enumerate(questions):
        assert 'fun_fact' in q, f"Question {idx} missing fun_fact"
        assert isinstance(q['fun_fact'], dict), f"Question {idx} fun_fact is not an object"
        assert q['fun_fact'] is not None, f"Question {idx} fun_fact is null"


def test_each_question_retains_question_prompt_or_text(questions):
    for idx, q in enumerate(questions):
        assert ('question' in q) or ('prompt' in q) or ('text' in q), \
            f"Question {idx} has no question, prompt, or text property"


def test_fun_fact_has_text_and_image_path(questions):
    for idx, q in enumerate(questions):
        fun_fact = q['fun_fact']
        assert 'text' in fun_fact, f"Question {idx} fun_fact missing text"
        assert 'image_path' in fun_fact, f"Question {idx} fun_fact missing image_path"


def test_fun_fact_text_is_non_empty_string(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text']
        assert isinstance(text, str), f"Question {idx} fun_fact text is not a string"
        assert len(text.strip()) > 0, f"Question {idx} fun_fact text is empty"


def test_fun_fact_image_path_is_non_empty_string(questions):
    for idx, q in enumerate(questions):
        image_path = q['fun_fact']['image_path']
        assert isinstance(image_path, str), f"Question {idx} fun_fact image_path is not a string"
        assert len(image_path.strip()) > 0, f"Question {idx} fun_fact image_path is empty"


def test_fun_fact_has_only_text_and_image_path_keys(questions):
    allowed_keys = {'text', 'image_path'}
    for idx, q in enumerate(questions):
        actual_keys = set(q['fun_fact'].keys())
        extra = actual_keys - allowed_keys
        assert not extra, f"Question {idx} fun_fact has unexpected keys: {extra}"


def test_all_fun_fact_texts_are_unique(questions):
    texts = [q['fun_fact']['text'] for q in questions]
    assert len(set(texts)) == len(texts), "Duplicate fun_fact texts found"


def test_all_fun_fact_image_paths_are_unique(questions):
    image_paths = [q['fun_fact']['image_path'] for q in questions]
    assert len(set(image_paths)) == len(image_paths), "Duplicate fun_fact image_paths found"


def test_fun_fact_text_does_not_contain_inappropriate_words(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text'].lower()
        for word in INAPPROPRIATE_WORDS:
            pattern = r'\b' + re.escape(word) + r'\b'
            assert not re.search(pattern, text), \
                f"Question {idx} fun_fact text contains inappropriate word: {word}"


def test_fun_fact_text_appropriate_for_ages_6_to_9(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text']
        words = [w for w in re.split(r'\s+', text) if w]
        assert len(words) > 0, f"Question {idx} fun_fact text has no words"
        total_chars = sum(len(re.sub(r'[^a-zA-Z]', '', w)) for w in words)
        avg_word_length = total_chars / len(words)
        assert avg_word_length <= 8, \
            f"Question {idx} fun_fact text avg word length {avg_word_length:.2f} exceeds 8"


def test_fun_fact_text_no_word_longer_than_12_chars(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text']
        words = re.split(r'\s+', text)
        for word in words:
            cleaned = re.sub(r'[^a-zA-Z]', '', word)
            if cleaned:
                assert len(cleaned) <= 12, \
                    f"Question {idx} fun_fact text has overly long word: {word}"


def test_fun_fact_text_max_3_sentences(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text']
        sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
        assert len(sentences) <= 3, \
            f"Question {idx} fun_fact text has {len(sentences)} sentences (max 3)"


def test_fun_fact_text_ends_with_proper_punctuation(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text'].strip()
        assert text[-1] in '.!?', \
            f"Question {idx} fun_fact text does not end with proper punctuation"


def test_fun_fact_text_min_10_characters(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text'].strip()
        assert len(text) >= 10, \
            f"Question {idx} fun_fact text is shorter than 10 characters"


def test_fun_fact_text_max_300_characters(questions):
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text']
        assert len(text) <= 300, \
            f"Question {idx} fun_fact text exceeds 300 characters"


def test_fun_fact_text_not_duplicate_of_question_text(questions):
    question_texts = []
    for q in questions:
        qt = q.get('question') or q.get('prompt') or q.get('text') or ''
        question_texts.append(qt.lower().strip())
    for idx, q in enumerate(questions):
        fact_text = q['fun_fact']['text'].lower().strip()
        assert fact_text not in question_texts, \
            f"Question {idx} fun_fact text duplicates a question text"


def test_image_path_has_valid_extension(questions):
    for idx, q in enumerate(questions):
        image_path = q['fun_fact']['image_path']
        ext = os.path.splitext(image_path)[1].lower()
        assert ext in VALID_IMAGE_EXTENSIONS, \
            f"Question {idx} image_path has invalid extension: {ext}"


def test_image_path_has_valid_prefix(questions):
    for idx, q in enumerate(questions):
        image_path = q['fun_fact']['image_path']
        assert image_path.startswith(VALID_IMAGE_PREFIXES), \
            f"Question {idx} image_path has invalid prefix: {image_path}"


def test_fun_fact_text_is_age_appropriate_vocabulary(questions):
    # Additional check: ensure no complex scientific jargon that would
    # be inappropriate for 6-9 year olds.
    complex_terms = [
        'paleontological', 'stratigraphy', 'phylogenetic', 'morphological',
        'biogeography', 'taphonomy', 'ichnology', 'osteoderm', 'theropoda',
        'sauropodomorpha', 'ceratopsian', 'pachycephalosaur', 'ornithischian',
        'saurischian', 'cladistics', 'systematics', 'binomial', 'nomenclature'
    ]
    for idx, q in enumerate(questions):
        text = q['fun_fact']['text'].lower()
        for term in complex_terms:
            assert term not in text, \
                f"Question {idx} fun_fact text contains complex term: {term}"
