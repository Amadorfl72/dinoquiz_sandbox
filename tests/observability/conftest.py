import json
import os
import yaml
import pytest


DASHBOARDS_DIR = os.environ.get("DASHBOARDS_DIR", "monitoring/dashboards")
ALERTS_DIR = os.environ.get("ALERTS_DIR", "monitoring/alerts")


def load_json_files(directory):
    files = []
    if not os.path.isdir(directory):
        return files
    for fname in sorted(os.listdir(directory)):
        if fname.endswith(".json"):
            fpath = os.path.join(directory, fname)
            with open(fpath) as f:
                data = json.load(f)
            if isinstance(data.get("dashboard"), dict):
                data = data["dashboard"]
            files.append((fname, data))
    return files


def load_yaml_files(directory):
    files = []
    if not os.path.isdir(directory):
        return files
    for fname in sorted(os.listdir(directory)):
        if fname.endswith((".yaml", ".yml")):
            fpath = os.path.join(directory, fname)
            with open(fpath) as f:
                docs = list(yaml.safe_load_all(f))
            files.append((fname, docs))
    return files


@pytest.fixture(scope="module")
def dashboard_files():
    return load_json_files(DASHBOARDS_DIR)


@pytest.fixture(scope="module")
def alert_files():
    return load_yaml_files(ALERTS_DIR)


@pytest.fixture(scope="module")
def all_panels(dashboard_files):
    panels = []
    for fname, dash in dashboard_files:
        for p in dash.get("panels", []):
            panels.append((fname, p))
    return panels


@pytest.fixture(scope="module")
def all_alert_rules(alert_files):
    rules = []
    for fname, docs in alert_files:
        for doc in docs:
            if not doc:
                continue
            for group in doc.get("groups", []):
                for rule in group.get("rules", []):
                    rules.append((fname, rule))
            for rule in doc.get("rules", []):
                rules.append((fname, rule))
            # Support a single top-level alert rule (no groups/rules wrapper)
            if "alert" in doc:
                rules.append((fname, doc))
    return rules
