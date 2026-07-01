import json
import os
from pathlib import Path

import pytest


CONFIG_DIR = Path(os.environ.get("OBS_CONFIG_DIR", "config/observability"))


@pytest.fixture(scope="session")
def alerts_config():
    path = CONFIG_DIR / "alerts.json"
    with path.open() as f:
        return json.load(f)


@pytest.fixture(scope="session")
def dashboards_config():
    path = CONFIG_DIR / "dashboards.json"
    with path.open() as f:
        return json.load(f)


@pytest.fixture(scope="session")
def funnel_dashboard(dashboards_config):
    for dashboard in dashboards_config.get("dashboards", []):
        if dashboard.get("id") == "funnel":
            return dashboard
    pytest.fail("Funnel dashboard not found in dashboards config")
