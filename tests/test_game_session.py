# DEPRECATED - Game session state management has been consolidated into the TypeScript implementation
# This file will be removed in a future update

import unittest
from game_session import GameSession

class TestGameSessionStateManagement(unittest.TestCase):
    def setUp(self):
        self.questions = [f"Question {i}" for i in range(10)]
        self.session = GameSession(self.questions)

    def test_initialization(self):
        self.assertEqual(len(self.session.questions), 10)
        self.assertEqual(self.session.get_current_index(), 0)
        self.assertFalse(self.session.is_finished())

    def test_get_current_question(self):
        self.assertEqual(self.session.get_current_question(), "Question 0")

    def test_next_question_transition(self):
        self.assertEqual(self.session.get_current_question(), "Question 0")
        self.session.next_question()
        self.assertEqual(self.session.get_current_index(), 1)
        self.assertEqual(self.session.get_current_question(), "Question 1")

    def test_no_previous_question_shown_again(self):
        seen_questions = [self.session.get_current_question()]
        for _ in range(9):
            self.session.next_question()
            seen_questions.append(self.session.get_current_question())
        
        # Ensure all 10 questions are unique and match the original order
        self.assertEqual(len(set(seen_questions)), 10)
        self.assertEqual(seen_questions, self.questions)

    def test_is_finished_at_end(self):
        for _ in range(9):
            self.session.next_question()
            self.assertFalse(self.session.is_finished())
        
        self.assertEqual(self.session.get_current_index(), 9)
        self.assertEqual(self.session.get_current_question(), "Question 9")
        self.assertFalse(self.session.is_finished())

        self.session.next_question()
        self.assertTrue(self.session.is_finished())

    def test_next_question_when_finished(self):
        for _ in range(10):
            self.session.next_question()
        
        self.assertTrue(self.session.is_finished())
        with self.assertRaises(IndexError):
            self.session.next_question()

if __name__ == '__main__':
    unittest.main()