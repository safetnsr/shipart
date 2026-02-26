"""Tests for themes.py."""

import pytest

from shipart.themes import THEMES, build_prompt


class TestThemes:
    def test_all_themes_present(self):
        assert "terminal-dark" in THEMES
        assert "minimal" in THEMES
        assert "bold" in THEMES

    def test_each_theme_has_required_keys(self):
        for name, theme in THEMES.items():
            assert "label" in theme, f"{name} missing 'label'"
            assert "style_instructions" in theme, f"{name} missing 'style_instructions'"

    def test_style_instructions_not_empty(self):
        for name, theme in THEMES.items():
            assert len(theme["style_instructions"]) > 50, f"{name} style_instructions too short"


class TestBuildPrompt:
    def setup_method(self):
        self.meta = {
            "name": "shipart",
            "description": "generate README hero images",
            "category": "CLI tool",
            "tech": ["python", "click", "google-genai"],
        }

    def test_includes_tool_name(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "shipart" in prompt

    def test_includes_description(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "generate README hero images" in prompt

    def test_includes_category(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "CLI tool" in prompt

    def test_includes_tech(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "python" in prompt

    def test_mentions_aspect_ratio(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "16:9" in prompt or "1280x640" in prompt

    def test_terminal_dark_theme_mentions_black(self):
        prompt = build_prompt(self.meta, "terminal-dark")
        assert "black" in prompt.lower() or "#000000" in prompt

    def test_minimal_theme_mentions_white(self):
        prompt = build_prompt(self.meta, "minimal")
        assert "white" in prompt.lower() or "#ffffff" in prompt.lower()

    def test_bold_theme_mentions_contrast(self):
        prompt = build_prompt(self.meta, "bold")
        assert "contrast" in prompt.lower() or "bold" in prompt.lower()

    def test_handles_missing_tech(self):
        meta = {"name": "tool", "description": "A tool", "category": "library", "tech": []}
        prompt = build_prompt(meta, "terminal-dark")
        assert "tool" in prompt
        assert "open source" in prompt

    def test_handles_missing_description(self):
        meta = {"name": "tool", "description": None, "category": "library", "tech": []}
        prompt = build_prompt(meta, "terminal-dark")
        assert "tool" in prompt

    def test_limits_tech_to_five(self):
        # Use UUIDs as tech names to avoid false substring matches
        tech = [f"uniquelib{i:04d}" for i in range(7)]
        meta = {**self.meta, "tech": tech}
        prompt = build_prompt(meta, "terminal-dark")
        # Items 0-4 should be present, items 5-6 should be cut off
        assert "uniquelib0000" in prompt
        assert "uniquelib0004" in prompt
        assert "uniquelib0005" not in prompt
        assert "uniquelib0006" not in prompt

    def test_default_theme(self):
        prompt = build_prompt(self.meta)  # no theme arg
        assert "shipart" in prompt
