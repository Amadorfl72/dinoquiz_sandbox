import pytest
from unittest.mock import patch, mock_open
from score_manager import BestScoreStorage


class TestBestScoreStorage:
    """Tests for best score persistence layer (TRIOFSND-44)."""

    def test_storage_returns_none_when_no_file_exists(self, tmp_path):
        storage = BestScoreStorage(filepath=str(tmp_path / "nonexistent.json"))
        assert storage.get_best_score() is None

    def test_storage_saves_and_retrieves_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(150)
        assert storage.get_best_score() == 150

    def test_storage_overwrites_previous_score(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(100)
        storage.set_best_score(200)
        assert storage.get_best_score() == 200

    def test_storage_persists_across_instances(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage1 = BestScoreStorage(filepath=filepath)
        storage1.set_best_score(300)

        storage2 = BestScoreStorage(filepath=filepath)
        assert storage2.get_best_score() == 300

    def test_storage_per_player_scores(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(100, player_id="p1")
        storage.set_best_score(200, player_id="p2")
        assert storage.get_best_score(player_id="p1") == 100
        assert storage.get_best_score(player_id="p2") == 200

    def test_storage_updating_one_player_does_not_affect_another(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(100, player_id="p1")
        storage.set_best_score(200, player_id="p2")
        storage.set_best_score(150, player_id="p1")
        assert storage.get_best_score(player_id="p1") == 150
        assert storage.get_best_score(player_id="p2") == 200

    def test_storage_default_player_key(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(100)
        assert storage.get_best_score() == 100

    def test_storage_handles_corrupt_file_gracefully(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        filepath_obj = tmp_path / "scores.json"
        filepath_obj.write_text("{invalid json content}")
        storage = BestScoreStorage(filepath=filepath)
        assert storage.get_best_score() is None

    def test_storage_handles_empty_file(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        filepath_obj = tmp_path / "scores.json"
        filepath_obj.write_text("")
        storage = BestScoreStorage(filepath=filepath)
        assert storage.get_best_score() is None

    def test_storage_zero_score_is_valid(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(0)
        assert storage.get_best_score() == 0

    def test_storage_negative_score_is_valid(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(-50)
        assert storage.get_best_score() == -50

    def test_storage_float_score_is_valid(self, tmp_path):
        filepath = str(tmp_path / "scores.json")
        storage = BestScoreStorage(filepath=filepath)
        storage.set_best_score(99.5)
        assert storage.get_best_score() == 99.5
