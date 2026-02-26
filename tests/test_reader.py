"""Tests for reader.py."""

import json
import tempfile
from pathlib import Path

import pytest

from shipart.reader import read_project, _extract_from_readme, _extract_from_package_json


class TestExtractFromReadme:
    def test_extracts_h1_as_name(self):
        readme = "# mycli\n\nA fast command-line tool.\n"
        meta = _extract_from_readme(readme)
        assert meta["name"] == "mycli"

    def test_extracts_first_paragraph_as_description(self):
        readme = "# mycli\n\nA fast command-line tool for developers.\n"
        meta = _extract_from_readme(readme)
        assert meta["description"] == "A fast command-line tool for developers."

    def test_skips_image_lines_for_description(self):
        readme = "# mycli\n\n![banner](./banner.png)\n\nA fast tool.\n"
        meta = _extract_from_readme(readme)
        assert meta["description"] == "A fast tool."

    def test_extracts_code_block_languages(self):
        readme = "# tool\n\ndesc\n\n```python\ncode\n```\n\n```bash\nrun\n```\n"
        meta = _extract_from_readme(readme)
        assert "python" in meta["tech"]
        assert "bash" in meta["tech"]

    def test_detects_cli_category(self):
        readme = "# tool\n\nA CLI tool.\n\n```bash\n$ tool --help\n```"
        meta = _extract_from_readme(readme)
        assert meta["category"] == "CLI tool"

    def test_detects_npm_category(self):
        readme = "# tool\n\nA package.\n\n```bash\nnpm install mypackage\n```"
        meta = _extract_from_readme(readme)
        assert meta["category"] == "npm package"

    def test_handles_empty_readme(self):
        meta = _extract_from_readme("")
        assert meta["name"] is None
        assert meta["description"] is None


class TestExtractFromPackageJson:
    def test_extracts_name_and_description(self):
        data = {"name": "mycli", "description": "A CLI tool", "dependencies": {}}
        meta = _extract_from_package_json(data)
        assert meta["name"] == "mycli"
        assert meta["description"] == "A CLI tool"

    def test_strips_at_scope_from_name(self):
        data = {"name": "@scope/mycli", "description": "desc"}
        meta = _extract_from_package_json(data)
        assert meta["name"] == "scope-mycli"

    def test_extracts_deps(self):
        data = {
            "name": "tool",
            "dependencies": {"express": "^4.0.0", "axios": "^1.0.0"},
        }
        meta = _extract_from_package_json(data)
        assert "express" in meta["tech"]

    def test_detects_cli_if_bin(self):
        data = {"name": "tool", "bin": {"tool": "./dist/cli.js"}}
        meta = _extract_from_package_json(data)
        assert meta["category"] == "CLI tool"


class TestReadProject:
    def test_reads_package_json(self, tmp_path):
        pkg = {"name": "testpkg", "description": "A test package", "dependencies": {}}
        (tmp_path / "package.json").write_text(json.dumps(pkg))
        meta = read_project(tmp_path)
        assert meta["name"] == "testpkg"
        assert meta["description"] == "A test package"

    def test_falls_back_to_directory_name(self, tmp_path):
        meta = read_project(tmp_path)
        assert meta["name"] == tmp_path.name

    def test_reads_readme_for_fallback(self, tmp_path):
        (tmp_path / "README.md").write_text("# myproject\n\nA great project.\n")
        meta = read_project(tmp_path)
        assert meta["name"] == "myproject"
        assert meta["description"] == "A great project."

    def test_package_json_name_overrides_readme(self, tmp_path):
        pkg = {"name": "pkg-name", "description": "pkg desc"}
        (tmp_path / "package.json").write_text(json.dumps(pkg))
        (tmp_path / "README.md").write_text("# readme-name\n\nreadme desc\n")
        meta = read_project(tmp_path)
        assert meta["name"] == "pkg-name"
        assert meta["description"] == "pkg desc"

    def test_reads_pyproject_toml(self, tmp_path):
        toml_content = '[project]\nname = "mylib"\ndescription = "A Python lib"\ndependencies = ["click>=8.0", "requests"]\n'
        (tmp_path / "pyproject.toml").write_text(toml_content)
        meta = read_project(tmp_path)
        assert meta["name"] == "mylib"
        assert "click" in meta["tech"]

    def test_merges_tech_from_multiple_sources(self, tmp_path):
        pkg = {"name": "tool", "dependencies": {"express": "^4.0.0"}}
        (tmp_path / "package.json").write_text(json.dumps(pkg))
        (tmp_path / "README.md").write_text("# tool\n\nA tool.\n\n```python\ncode\n```\n")
        meta = read_project(tmp_path)
        assert "express" in meta["tech"]
        assert "python" in meta["tech"]
