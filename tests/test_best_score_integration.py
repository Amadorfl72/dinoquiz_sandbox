import pytest
from score_manager import BestScoreManager, BestScoreStorage


class TestBestScoreIntegration:
    """Integration tests for best score comparison + storage (TRIOFSND-44)."""

    def test_full_flow_first_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        assert manager.get_best_score() is None
        assert manager.update_best_score(score=100) is True
        assert manager.get_best_score() == 100

    def test_full_flow_improving_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        manager.update_best_score(score=100)
        assert manager.update_best_score(score=150) is True
        assert manager.get_best_score() == 150

    def test_full_flow_non_improving_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        manager.update_best_score(score=200)
        assert manager.update_best_score(score=100) is False
        assert manager.get_best_score() == 200

    def test_full_flow_equal_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        manager.update_best_score(score=200)
        assert manager.update_best_score(score=200) is False
        assert manager.get_best_score() == 200

    def test_full_flow_persistence_across_managers(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage1 = BestScoreStorage(filepath=filepath)
        manager1 = BestScoreManager(storage=storage1)
        manager1.update_best_score(score=500)

        storage2 = BestScoreStorage(filepath=filepath)
        manager2 = BestScoreManager(storage=storage2)
        assert manager2.get_best_score() == 500
        assert manager2.is_new_best(score=400) is False
        assert manager2.is_new_best(score=600) is True

    def test_full_flow_multi_player(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        assert manager.update_best_score(score=100, player_id="alice") is True
        assert manager.update_best_score(score=200, player_id="bob") is True
        assert manager.update_best_score(score=150, player_id="alice") is True
        assert manager.update_best_score(score=100, player_id="bob") is False

        assert manager.get_best_score(player_id="alice") == 150
        assert manager.get_best_score(player_id="bob") == 200

    def test_full_flow_zero_and_negative_scores(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        assert manager.update_best_score(score=0) is True
        assert manager.get_best_score() == 0
        assert manager.update_best_score(score=-10) is False
        assert manager.get_best_score() == 0
        assert manager.update_best_score(score=5) is True
        assert manager.get_best_score() == 5

    def test_full_flow_progressive_improvement(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        scores = [10, 20, 30, 40, 50]
        for i, score in enumerate(scores):
            result = manager.update_best_score(score=score)
            assert result is True
            assert manager.get_best_score() == score

    def test_full_flow_alternating_good_bad(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        manager = BestScoreManager(storage=storage)

        sequence = [
            (50, True),
            (30, False),
            (60, True),
            (55, False),
            (70, True),
            (70, False),
            (65, False),
            (100, True),
        ]
        for score, expected_result in sequence:
            assert manager.update_best_score(score=score) is expected_result
        assert manager.get_best_score() == 100
