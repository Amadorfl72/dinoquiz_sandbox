import pytest


EXPECTED_FUNNEL_STEPS = [
    "app_open",
    "pantalla_inicio",
    "tap_jugar",
    "partida_iniciada",
]


class TestDashboardExistence:
    def test_at_least_one_dashboard_exists(self, dashboard_files):
        assert len(dashboard_files) > 0, "No dashboard JSON files found"

    def test_dashboard_has_title(self, dashboard_files):
        for fname, dash in dashboard_files:
            assert "title" in dash and dash["title"], f"{fname}: missing title"

    def test_dashboard_has_panels(self, dashboard_files):
        for fname, dash in dashboard_files:
            assert "panels" in dash, f"{fname}: missing panels key"
            assert len(dash["panels"]) > 0, f"{fname}: no panels defined"


class TestTTIP95Panel:
    def test_tti_p95_panel_exists(self, all_panels):
        found = False
        for fname, panel in all_panels:
            title = panel.get("title", "").lower()
            targets = panel.get("targets", [])
            exprs = []
            for t in targets:
                exprs.append(str(t.get("expr", "")) + str(t.get("query", "")))
            combined = title + " " + " ".join(exprs)
            if "tti" in combined and ("p95" in combined or "0.95" in combined or "quantile" in combined):
                found = True
                break
        assert found, "No panel found tracking TTI p95"

    def test_tti_p95_panel_uses_quantile(self, all_panels):
        found = False
        for fname, panel in all_panels:
            for t in panel.get("targets", []):
                expr = str(t.get("expr", "")) + str(t.get("query", ""))
                if "tti" in expr.lower() and ("quantile" in expr.lower() or "p95" in expr.lower() or "histogram_quantile" in expr.lower()):
                    found = True
                    break
        assert found, "TTI p95 panel should use a quantile/p95 aggregation"


class TestTimeBetweenAppOpenAndTapJugarPanel:
    def test_time_between_panel_exists(self, all_panels):
        found = False
        for fname, panel in all_panels:
            title = panel.get("title", "").lower()
            targets = panel.get("targets", [])
            exprs = " ".join([str(t.get("expr", "")) + str(t.get("query", "")) for t in targets]).lower()
            combined = title + " " + exprs
            if "app_open" in combined and "tap_jugar" in combined and ("time" in combined or "duration" in combined or "between" in combined):
                found = True
                break
        assert found, "No panel found tracking time between app_open and first_tap_jugar"

    def test_time_between_panel_references_both_events(self, all_panels):
        found = False
        for fname, panel in all_panels:
            for t in panel.get("targets", []):
                expr = str(t.get("expr", "")) + str(t.get("query", "")).lower()
                if "app_open" in expr and "tap_jugar" in expr:
                    found = True
                    break
        assert found, "Time-between panel must reference both app_open and tap_jugar events"


class TestFunnelDashboard:
    def test_funnel_panel_exists(self, all_panels):
        found = False
        for fname, panel in all_panels:
            title = panel.get("title", "").lower()
            if "funnel" in title:
                found = True
                break
        assert found, "No panel with 'funnel' in the title found"

    def test_funnel_panel_references_all_steps(self, all_panels):
        funnel_panels = [p for _, p in all_panels if "funnel" in p.get("title", "").lower()]
        assert len(funnel_panels) > 0, "No funnel panel found"
        for panel in funnel_panels:
            all_exprs = " ".join([
                str(t.get("expr", "")) + str(t.get("query", ""))
                for t in panel.get("targets", [])
            ]).lower()
            for step in EXPECTED_FUNNEL_STEPS:
                assert step.lower() in all_exprs, (
                    f"Funnel panel missing step '{step}' in query expressions"
                )

    def test_funnel_step_order_documented(self, all_panels):
        funnel_panels = [p for _, p in all_panels if "funnel" in p.get("title", "").lower()]
        for panel in funnel_panels:
            description = panel.get("description", "").lower()
            for step in EXPECTED_FUNNEL_STEPS:
                assert step.lower() in description or step.lower() in " ".join([
                    str(t.get("expr", "")) + str(t.get("query", ""))
                    for t in panel.get("targets", [])
                ]).lower(), (
                    f"Funnel step '{step}' not found in panel description or queries"
                )


class TestPanelValidity:
    def test_panels_have_unique_ids(self, dashboard_files):
        for fname, dash in dashboard_files:
            ids = [p.get("id") for p in dash.get("panels", []) if "id" in p]
            assert len(ids) == len(set(ids)), f"{fname}: duplicate panel IDs"

    def test_panels_have_datasource(self, dashboard_files):
        for fname, dash in dashboard_files:
            for p in dash.get("panels", []):
                ds = p.get("datasource") or dash.get("datasource")
                assert ds is not None, f"{fname}: panel '{p.get('title')}' has no datasource"

    def test_panels_have_targets(self, dashboard_files):
        for fname, dash in dashboard_files:
            for p in dash.get("panels", []):
                assert "targets" in p and len(p["targets"]) > 0, (
                    f"{fname}: panel '{p.get('title')}' has no query targets"
                )
