import json
import os
from jsonschema import validate
from jsonschema.exceptions import ValidationError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def test_schema_exists_and_structure():
    schema_path = os.path.join(BASE_DIR, 'schemas', 'question_schema.json')
    assert os.path.exists(schema_path), "Schema file does not exist at schemas/question_schema.json"
    schema = load_json(schema_path)
    assert schema.get('type') == 'object'
    required_props = ['statement', 'options', 'correctIndex', 'dinoId', 'funFact', 'image']
    for prop in required_props:
        assert prop in schema.get('properties', {}), f"Schema missing property: {prop}"
    assert schema['properties']['options'].get('type') == 'array'
    assert schema['properties']['options'].get('minItems') == 3
    assert schema['properties']['options'].get('maxItems') == 3

def test_seed_data_exists_and_validates():
    schema_path = os.path.join(BASE_DIR, 'schemas', 'question_schema.json')
    seed_path = os.path.join(BASE_DIR, 'data', 'questions.json')
    
    assert os.path.exists(seed_path), "Seed data file does not exist at data/questions.json"
    
    schema = load_json(schema_path)
    seed_data = load_json(seed_path)
    
    assert isinstance(seed_data, list), "Seed data should be a list of questions"
    assert len(seed_data) == 30, "Seed data should contain exactly 30 questions"
    
    for i, question in enumerate(seed_data):
        try:
            validate(instance=question, schema=schema)
        except ValidationError as e:
            assert False, f"Question at index {i} failed validation: {e.message}"
        
        assert len(question['options']) == 3, f"Question {i} must have exactly 3 options"
        assert isinstance(question['correctIndex'], int), f"Question {i} correctIndex must be an integer"
        assert 0 <= question['correctIndex'] < 3, f"Question {i} correctIndex must be between 0 and 2"
        assert isinstance(question['dinoId'], str) and len(question['dinoId']) > 0, f"Question {i} dinoId must be a non-empty string"
        assert isinstance(question['statement'], str) and len(question['statement']) > 0, f"Question {i} statement must be a non-empty string"
        assert isinstance(question['funFact'], str) and len(question['funFact']) > 0, f"Question {i} funFact must be a non-empty string"
        assert isinstance(question['image'], str) and len(question['image']) > 0, f"Question {i} image must be a non-empty string"
