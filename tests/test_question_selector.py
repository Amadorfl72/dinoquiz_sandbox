import unittest
from question_selector import RandomQuestionSelector

class TestRandomQuestionSelector(unittest.TestCase):
    def setUp(self):
        self.selector = RandomQuestionSelector()
        self.questions = [
            {"id": 1, "text": "What is 2+2?"},
            {"id": 2, "text": "What is 3+3?"},
            {"id": 3, "text": "What is 4+4?"},
            {"id": 4, "text": "What is 5+5?"},
            {"id": 5, "text": "What is 6+6?"}
        ]

    def test_select_exact_count(self):
        result = self.selector.select(self.questions, 3)
        self.assertEqual(len(result), 3)

    def test_select_zero_count(self):
        result = self.selector.select(self.questions, 0)
        self.assertEqual(result, [])

    def test_select_all_questions(self):
        result = self.selector.select(self.questions, len(self.questions))
        self.assertEqual(len(result), len(self.questions))
        self.assertCountEqual(result, self.questions)

    def test_select_empty_pool(self):
        with self.assertRaises(ValueError):
            self.selector.select([], 1)

    def test_select_negative_count(self):
        with self.assertRaises(ValueError):
            self.selector.select(self.questions, -1)

    def test_select_count_greater_than_pool(self):
        with self.assertRaises(ValueError):
            self.selector.select(self.questions, 10)

    def test_no_duplicates(self):
        result = self.selector.select(self.questions, 3)
        ids = [q["id"] for q in result]
        self.assertEqual(len(ids), len(set(ids)))

    def test_result_is_subset_of_pool(self):
        result = self.selector.select(self.questions, 3)
        for q in result:
            self.assertIn(q, self.questions)

if __name__ == '__main__':
    unittest.main()
