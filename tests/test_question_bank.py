import unittest
import json
import os

QUESTION_BANK_PATH = 'questions.json'
EXPECTED_DINOSAURS = [
    "T-Rex", "Triceratops", "Velociraptor", 
    "Stegosaurus", "Brachiosaurus", "Ankylosaurus", "Pteranodon"
]

class TestQuestionBank(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.questions = []
        if os.path.exists(QUESTION_BANK_PATH):
            with open(QUESTION_BANK_PATH, 'r', encoding='utf-8') as f:
                cls.questions = json.load(f)

    def test_file_exists(self):
        self.assertTrue(os.path.exists(QUESTION_BANK_PATH), f"{QUESTION_BANK_PATH} does not exist.")

    def test_valid_json_and_count(self):
        self.assertIsInstance(self.questions, list, "Question bank should be a JSON array.")
        self.assertEqual(len(self.questions), 40, "There must be exactly 40 questions.")

    def test_dinosaur_distribution(self):
        counts = {d: 0 for d in EXPECTED_DINOSAURS}
        for q in self.questions:
            dino = q.get("dinosaur")
            if dino in counts:
                counts[dino] += 1
        
        for dino, count in counts.items():
            self.assertGreaterEqual(count, 3, f"{dino} must have at least 3 questions, found {count}.")

    def test_question_structure(self):
        required_keys = {"statement", "options", "correct_answer", "fun_fact", "image_reference", "dinosaur"}
        for i, q in enumerate(self.questions):
            with self.subTest(question_index=i):
                self.assertTrue(required_keys.issubset(q.keys()), f"Question {i} missing keys: {required_keys - q.keys()}")
                self.assertIsInstance(q["statement"], str) and self.assertTrue(q["statement"], f"Question {i} statement cannot be empty.")
                self.assertIsInstance(q["fun_fact"], str) and self.assertTrue(q["fun_fact"], f"Question {i} fun fact cannot be empty.")
                self.assertIsInstance(q["image_reference"], str) and self.assertTrue(q["image_reference"], f"Question {i} image reference cannot be empty.")
                self.assertIsInstance(q["options"], list)
                self.assertTrue(3 <= len(q["options"]) <= 4, f"Question {i} must have 3-4 options, found {len(q['options'])}.")
                self.assertIn(q["correct_answer"], q["options"], f"Question {i} correct answer not in options.")
                self.assertIn(q["dinosaur"], EXPECTED_DINOSAURS, f"Question {i} has invalid dinosaur: {q['dinosaur']}.")

if __name__ == '__main__':
    unittest.main()