import json

# Load questions from JSON file
with open('src/data/questions.json', 'r') as file:
    questions = json.load(file)['questions']

# Test to ensure all fun_fact image_paths are unique
def test_fun_fact_image_path_is_unique():
    image_paths = [q['image_path'] for q in questions]
    unique_image_paths = set(image_paths)
    assert len(unique_image_paths) == len(image_paths), "Duplicate fun_fact image_paths found."

test_fun_fact_image_path_is_unique()