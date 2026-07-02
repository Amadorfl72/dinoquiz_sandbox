import json
import os
import yaml
import pytest


DASHBOARDS_DIR = os.environ.get("DASHBOARDS_DIR", "observability/dashboards")
ALERTS_DIR = os.environ.get("ALERTS_DIR", "observability/alerts")


class TestDashboardSyntax:
    def test_all_dashboard_json_files_are_valid(self):
        if not os.path.isdir(DASHBOARDS_DIR):
            pytest.skip(f"Dashboards dir {DASHBOARDS_DIR} does not exist")
        for fname in os.listdir(DASHBOARDS_DIR):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(DASHBOARDS_DIR, fname)
            with open(fpath) as f:
                try:
                    data = json.load(f)
                    assert isinstance(data, dict), f"{fname}: root is not a JSON object"
                except json.JSONDecodeError as e:
                    pytest.fail(f"{fname}: invalid JSON: {e}")

    def test_dashboard_has_required_top_level_keys(self):
        if not os.path.isdir(DASHBOARDS_DIR):
            pytest.skip(f"Dashboards dir {DASHBOARDS_DIR} does not exist")
        required_keys = ["title", "panels"]
        for fname in os.listdir(DASHBOARDS_DIR):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(DASHBOARDS_DIR, fname)
            with open(fpath) as f:
                data = json.load(f)
            for key in required_keys:
                assert key in data, f"{fname}: missing required key '{key}'"


class TestAlertSyntax:
    def test_all_alert_yaml_files_are_valid(self):
        if not os.path.isdir(ALERTS_DIR):
            pytest.skip(f"Alerts dir {ALERTS_DIR} does not exist")
        for fname in os.listdir(ALERTS_DIR):
            if not fname.endswith((".yaml", ".yml")):
                continue
            fpath = os.path.join(ALERTS_DIR, fname)
            with open(fpath) as f:
                try:
                    list(yaml.safe_load_all(f))
                except yaml.YAMLError as e:
                    pytest.fail(f"{fname}: invalid YAML: {e}")

    def test_alert_files_have_groups_or_rules(self):
        if not os.path.isdir(ALERTS_DIR):
            pytest.skip(f"Alerts dir {ALERTS_DIR} does not exist")
        for fname in os.listdir(ALERTS_DIR):
            if not fname.endswith((".yaml", ".yml")):
                continue
            fpath = os.path.join(ALERTS_DIR, fname)
            with open(fpath) as f:
                for doc in yaml.safe_load_all(f):
                    if doc is None:
                        continue
                    assert "groups" in doc or "rules" in doc, (
                        f"{fname}: must have 'groups' or 'rules' key"
                    )


class TestPromQLSyntax:
    def test_alert_expressions_are_non_empty_strings(self):
        if not os.path.isdir(ALERTS_DIR):
            pytest.skip(f"Alerts dir {ALERTS_DIR} does not exist")
        for fname in os.listdir(ALERTS_DIR):
            if not fname.endswith((".yaml", ".yml")):
                continue
            fpath = os.path.join(ALERTS_DIR, fname)
            with open(fpath) as f:
                for doc in yaml.safe_load_all(f):
                    if not doc:
                        continue
                    for group in doc.get("groups", []):
                        for rule in group.get("rules", []):
                            if "alert" in rule:
                                expr = rule.get("expr")
                                assert isinstance(expr, str) and len(expr.strip()) > 0, (
                                    f"{fname}: alert '{rule.get('alert')}' has empty expr"
                                )

    def test_alert_expressions_have_balanced_parens(self):
        if not os.path.isdir(ALERTS_DIR):
            pytest.skip(f"Alerts dir {ALERTS_DIR} does not exist")
        for fname in os.listdir(ALERTS_DIR):
            if not fname.endswith((".yaml", ".yml")):
                continue
            fpath = os.path.join(ALERTS_DIR, fname)
            with open(fpath) as f:
                for doc in yaml.safe_load_all(f):
                    if not doc:
                        continue
                    for group in doc.get("groups", []):
                        for rule in group.get("rules", []):
                            if "alert" in rule:
                                expr = rule.get("expr", "")
                                assert expr.count("(") == expr.count(")"), (
                                    f"{fname}: alert '{rule.get('alert')}' has unbalanced parentheses in expr"
                                )
                                assert expr.count("[") == expr.count("]"), (
                                    f"{fname}: alert '{rule.get('alert')}' has unbalanced brackets in expr"
                                )
