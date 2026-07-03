import json
import os
import re
from jsonschema import validate
from jsonschema.exceptions import ValidationError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCHEMA_PATH = os.path.join(BASE_DIR, 'src', 'assets', 'schema', 'questions.schema.json')
SEED_PATH = os.path.join(BASE_DIR, 'src', 'assets', 'questions.json')

REQUIRED_PROPS = ['statement', 'options', 'correctIndex', 'dinoId', 'funFact', 'image']


def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def test_schema_file_exists():
    assert os.path.exists(SCHEMA_PATH), "Schema file does not exist at src/assets/schema/questions.schema.json"


def test_schema_structure():
    schema = load_json(SCHEMA_PATH)
    assert schema.get('type') == 'object'
    assert schema.get('title') == 'Question'
    assert schema.get('$schema') == 'http://json-schema.org/draft-07/schema#'

    properties = schema.get('properties', {})
    for prop in REQUIRED_PROPS:
        assert prop in properties, f"Schema missing property: {prop}"

    assert properties['statement'].get('type') == 'string'
    assert properties['options'].get('type') == 'array'
    assert properties['options'].get('minItems') == 3
    assert properties['options'].get('maxItems') == 3
    assert properties['options']['items'].get('type') == 'string'
    assert properties['correctIndex'].get('type') == 'integer'
    assert properties['correctIndex'].get('minimum') == 0
    assert properties['dinoId'].get('type') == 'string'
    assert properties['funFact'].get('type') == 'string'
    assert properties['image'].get('type') == 'string'

    assert set(schema.get('required', [])) == set(REQUIRED_PROPS), \
        "Schema required array must match all required props"


def test_seed_file_exists():
    assert os.path.exists(SEED_PATH), "Seed data file does not exist at src/assets/questions.json"


def test_seed_data_is_list_with_30_questions():
    seed_data = load_json(SEED_PATH)
    assert isinstance(seed_data, list), "Seed data should be a list of questions"
    assert len(seed_data) == 30, f"Seed data should contain exactly 30 questions, got {len(seed_data)}"


def test_seed_data_validates_against_schema():
    schema = load_json(SCHEMA_PATH)
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        try:
            validate(instance=question, schema=schema)
        except ValidationError as e:
            assert False, f"Question at index {i} failed validation: {e.message}"


def test_seed_data_has_all_required_fields_non_empty():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        for prop in REQUIRED_PROPS:
            assert prop in question, f"Question {i} missing required field: {prop}"
        assert isinstance(question['statement'], str) and len(question['statement'].strip()) > 0, \
            f"Question {i} statement must be a non-empty string"
        assert isinstance(question['dinoId'], str) and len(question['dinoId'].strip()) > 0, \
            f"Question {i} dinoId must be a non-empty string"
        assert isinstance(question['funFact'], str) and len(question['funFact'].strip()) > 0, \
            f"Question {i} funFact must be a non-empty string"
        assert isinstance(question['image'], str) and len(question['image'].strip()) > 0, \
            f"Question {i} image must be a non-empty string"


def test_seed_data_options_exactly_three():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        options = question['options']
        assert isinstance(options, list), f"Question {i} options must be a list"
        assert len(options) == 3, f"Question {i} must have exactly 3 options, got {len(options)}"
        for j, opt in enumerate(options):
            assert isinstance(opt, str) and len(opt.strip()) > 0, \
                f"Question {i} option at index {j} must be a non-empty string"


def test_seed_data_options_are_unique():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        options = question['options']
        assert len(set(options)) == 3, f"Question {i} options must be unique"


def test_seed_data_correct_index_valid():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        correct_index = question['correctIndex']
        assert isinstance(correct_index, int), f"Question {i} correctIndex must be an integer"
        assert 0 <= correct_index < 3, \
            f"Question {i} correctIndex must be between 0 and 2, got {correct_index}"


def test_seed_data_correct_option_non_empty():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        correct_option = question['options'][question['correctIndex']]
        assert isinstance(correct_option, str) and len(correct_option.strip()) > 0, \
            f"Question {i} correct option must be non-empty"


def test_seed_data_image_is_png():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        image = question['image']
        assert image.endswith('.png'), f"Question {i} image must be a .png file, got {image}"


def test_seed_data_image_matches_dino_id():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        dino_id = question['dinoId']
        image = question['image']
        expected_image = f"{dino_id}.png"
        assert image == expected_image, \
            f"Question {i} image '{image}' should match dinoId '{dino_id}' as '{expected_image}'"


def test_seed_data_dino_ids_are_non_empty_strings():
    seed_data = load_json(SEED_PATH)
    for i, question in enumerate(seed_data):
        dino_id = question['dinoId']
        assert isinstance(dino_id, str), f"Question {i} dinoId must be a string"
        assert re.match(r'^[a-zA-Z]+$', dino_id), \
            f"Question {i} dinoId '{dino_id}' should contain only alphabetic characters"


def test_seed_data_statements_are_unique():
    seed_data = load_json(SEED_PATH)
    statements = [q['statement'] for q in seed_data]
    assert len(set(statements)) == len(statements), "Seed data statements must be unique"
