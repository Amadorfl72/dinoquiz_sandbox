import unittest
from score_manager import ScoreManager

class TestScoreManager(unittest.TestCase):
    def setUp(self):
        self.manager = ScoreManager()

    def test_initial_best_score_is_zero(self):
        self.assertEqual(self.manager.best_score, 0)

    def test_update_best_score_with_higher_score(self):
        self.manager.update_best_score(10)
        self.assertEqual(self.manager.best_score, 10)
        self.manager.update_best_score(20)
        self.assertEqual(self.manager.best_score, 20)

    def test_update_best_score_with_lower_score(self):
        self.manager.update_best_score(50)
        self.manager.update_best_score(30)
        self.assertEqual(self.manager.best_score, 50)

    def test_update_best_score_with_equal_score(self):
        self.manager.update_best_score(50)
        self.manager.update_best_score(50)
        self.assertEqual(self.manager.best_score, 50)

    def test_update_best_score_with_negative_score(self):
        self.manager.update_best_score(-10)
        self.assertEqual(self.manager.best_score, 0)

    def test_update_best_score_returns_boolean(self):
        self.assertTrue(self.manager.update_best_score(10))
        self.assertFalse(self.manager.update_best_score(5))
        self.assertTrue(self.manager.update_best_score(20))

if __name__ == '__main__':
    unittest.main()
