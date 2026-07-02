import re
import pytest


class TestAlertExistence:
    def test_at_least_one_alert_rule_exists(self, all_alert_rules):
        assert len(all_alert_rules) > 0, "No alert rules found"

    def test_tti_p95_alert_exists(self, all_alert_rules):
        found = False
        for fname, rule in all_alert_rules:
            name = rule.get("alert", "")
            expr = rule.get("expr", "")
            combined = (name + " " + str(expr)).lower()
            if "tti" in combined and ("p95" in combined or "quantile" in combined):
                found = True
                break
        assert found, "No alert rule found for TTI p95"


class TestTTIP95Threshold:
    def test_alert_threshold_is_2_seconds(self, all_alert_rules):
        found = False
        for fname, rule in all_alert_rules:
            expr = str(rule.get("expr", "")).lower()
            name = rule.get("alert", "").lower()
            if "tti" not in (name + expr):
                continue
            if "p95" not in (name + expr) and "quantile" not in (name + expr):
                continue
            # Look for threshold of 2 seconds: could be > 2, > 2.0, > 2000 (ms), etc.
            if re.search(r">\s*2(\.0+)?\b", expr) or re.search(r">\s*2000\b", expr):
                found = True
                break
        assert found, "TTI p95 alert threshold must be > 2s (or > 2000ms)"

    def test_alert_uses_greater_than_operator(self, all_alert_rules):
        found = False
        for fname, rule in all_alert_rules:
            expr = str(rule.get("expr", "")).lower()
            name = rule.get("alert", "").lower()
            if "tti" not in (name + expr):
                continue
            if ">" in expr:
                found = True
                break
        assert found, "TTI p95 alert must use a '>' comparison operator"


class TestAlertDuration:
    def test_alert_sustained_for_1_hour(self, all_alert_rules):
        found = False
        for fname, rule in all_alert_rules:
            expr = str(rule.get("expr", "")).lower()
            name = rule.get("alert", "").lower()
            if "tti" not in (name + expr):
                continue
            if "p95" not in (name + expr) and "quantile" not in (name + expr):
                continue
            # Check for 'for' duration field
            for_duration = str(rule.get("for", "")).lower()
            if "1h" in for_duration or "3600s" in for_duration or "60m" in for_duration:
                found = True
                break
            # Or check for a range vector like [1h] in the expression
            if re.search(r"\[\s*1h\s*\]", expr) or re.search(r"\[\s*3600s\s*\]", expr) or re.search(r"\[\s*60m\s*\]", expr):
                found = True
                break
        assert found, "TTI p95 alert must be sustained for 1 hour (for: 1h or [1h] range vector)"


class TestAlertMetadata:
    def test_alert_has_name(self, all_alert_rules):
        for fname, rule in all_alert_rules:
            assert "alert" in rule and rule["alert"], f"{fname}: alert rule missing name"

    def test_alert_has_expr(self, all_alert_rules):
        for fname, rule in all_alert_rules:
            assert "expr" in rule and rule["expr"], f"{fname}: alert rule '{rule.get('alert')}' missing expr"

    def test_alert_has_labels(self, all_alert_rules):
        for fname, rule in all_alert_rules:
            labels = rule.get("labels", {})
            assert "severity" in labels, (
                f"{fname}: alert '{rule.get('alert')}' missing severity label"
            )

    def test_alert_has_annotations(self, all_alert_rules):
        for fname, rule in all_alert_rules:
            annotations = rule.get("annotations", {})
            assert "summary" in annotations or "description" in annotations, (
                f"{fname}: alert '{rule.get('alert')}' missing summary/description annotation"
            )

    def test_tti_alert_has_runbook(self, all_alert_rules):
        found = False
        for fname, rule in all_alert_rules:
            name = rule.get("alert", "").lower()
            expr = str(rule.get("expr", "")).lower()
            if "tti" not in (name + expr):
                continue
            annotations = rule.get("annotations", {})
            combined = " ".join(annotations.values()).lower()
            if "runbook" in combined or "runbook" in str(rule.get("labels", {})).lower():
                found = True
                break
        assert found, "TTI p95 alert should reference a runbook in annotations or labels"
