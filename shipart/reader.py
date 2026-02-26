"""reader.py — extract project metadata from README + package files."""

import json
import re
import tomllib
from pathlib import Path
from typing import Optional


def _read_file(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def _extract_from_readme(readme: str) -> dict:
    """Extract name, description, tech stack hints from README."""
    result = {"name": None, "description": None, "tech": [], "category": None}

    lines = readme.splitlines()

    # First H1
    for line in lines:
        if line.startswith("# "):
            result["name"] = line[2:].strip()
            break

    # First non-empty paragraph after the H1
    found_h1 = False
    for line in lines:
        if line.startswith("# ") and not found_h1:
            found_h1 = True
            continue
        if found_h1:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and not stripped.startswith("!") and not stripped.startswith("```"):
                result["description"] = stripped
                break

    # Detect code block languages for tech stack
    langs = re.findall(r"```(\w+)", readme)
    known = {"python", "typescript", "javascript", "rust", "go", "bash", "sh",
             "toml", "yaml", "json", "sql", "dockerfile", "ruby", "java", "cpp",
             "c", "kotlin", "swift", "elixir"}
    result["tech"] = list(set(l.lower() for l in langs if l.lower() in known))

    # Category heuristics
    text_lower = readme.lower()
    if any(kw in text_lower for kw in ["cli", "command-line", "command line", "$ ", "usage:"]):
        result["category"] = "CLI tool"
    elif any(kw in text_lower for kw in ["npm install", "yarn add", "node_modules"]):
        result["category"] = "npm package"
    elif any(kw in text_lower for kw in ["pip install", "pypi", "python"]):
        result["category"] = "Python library"
    elif any(kw in text_lower for kw in ["cargo add", "crates.io"]):
        result["category"] = "Rust crate"
    elif any(kw in text_lower for kw in ["web app", "webapp", "api", "server"]):
        result["category"] = "web application"
    else:
        result["category"] = "open source library"

    return result


def _extract_from_package_json(data: dict) -> dict:
    """Extract metadata from package.json."""
    result = {"name": None, "description": None, "tech": [], "category": "npm package"}

    result["name"] = data.get("name", "").lstrip("@").replace("/", "-")
    result["description"] = data.get("description")

    deps = {}
    deps.update(data.get("dependencies", {}))
    deps.update(data.get("devDependencies", {}))

    # Pick interesting deps (skip very generic ones)
    skip = {"typescript", "eslint", "prettier", "jest", "vitest", "@types/node",
            "tsup", "rimraf", "cross-env", "dotenv"}
    interesting = [k for k in deps if k not in skip and not k.startswith("@types/")][:8]
    result["tech"] = interesting

    # Detect if it's a CLI tool
    if data.get("bin"):
        result["category"] = "CLI tool"

    return result


def _extract_from_pyproject(data: dict) -> dict:
    """Extract metadata from pyproject.toml."""
    result = {"name": None, "description": None, "tech": [], "category": "Python library"}

    project = data.get("project", {})
    result["name"] = project.get("name")
    result["description"] = project.get("description")

    deps = project.get("dependencies", [])
    tech = []
    for dep in deps:
        pkg = re.split(r"[>=<!;\[]", dep)[0].strip()
        if pkg:
            tech.append(pkg)
    result["tech"] = tech[:8]

    # Detect CLI
    scripts = project.get("scripts", {})
    if scripts or data.get("project", {}).get("entry-points"):
        result["category"] = "CLI tool"

    return result


def _extract_from_cargo(data: dict) -> dict:
    """Extract metadata from Cargo.toml."""
    result = {"name": None, "description": None, "tech": [], "category": "Rust crate"}

    pkg = data.get("package", {})
    result["name"] = pkg.get("name")
    result["description"] = pkg.get("description")

    deps = list(data.get("dependencies", {}).keys())[:8]
    result["tech"] = deps

    if data.get("bin") or data.get("[[bin]]"):
        result["category"] = "CLI tool"

    return result


def read_project(path: Path) -> dict:
    """
    Read a project directory and extract metadata.

    Returns dict with keys:
      name, description, tech, category, source_files
    """
    meta = {"name": None, "description": None, "tech": [], "category": "open source project", "source_files": []}

    # Try package files in priority order
    package_json = path / "package.json"
    pyproject = path / "pyproject.toml"
    cargo = path / "Cargo.toml"
    readme = path / "README.md"

    if package_json.exists():
        raw = _read_file(package_json)
        if raw:
            try:
                data = json.loads(raw)
                pkg_meta = _extract_from_package_json(data)
                meta.update({k: v for k, v in pkg_meta.items() if v})
                meta["source_files"].append("package.json")
            except json.JSONDecodeError:
                pass

    if pyproject.exists():
        raw = _read_file(pyproject)
        if raw:
            try:
                data = tomllib.loads(raw)
                py_meta = _extract_from_pyproject(data)
                # Only override if we don't already have good data
                for k, v in py_meta.items():
                    if v and not meta.get(k):
                        meta[k] = v
                meta["source_files"].append("pyproject.toml")
            except Exception:
                pass

    if cargo.exists():
        raw = _read_file(cargo)
        if raw:
            try:
                data = tomllib.loads(raw)
                cargo_meta = _extract_from_cargo(data)
                for k, v in cargo_meta.items():
                    if v and not meta.get(k):
                        meta[k] = v
                meta["source_files"].append("Cargo.toml")
            except Exception:
                pass

    if readme.exists():
        raw = _read_file(readme)
        if raw:
            readme_meta = _extract_from_readme(raw)
            # README as fallback for name/description
            for k in ("name", "description"):
                if readme_meta.get(k) and not meta.get(k):
                    meta[k] = readme_meta[k]
            # Merge tech from README
            existing_tech = set(meta.get("tech", []))
            for t in readme_meta.get("tech", []):
                if t not in existing_tech:
                    meta["tech"].append(t)
            # Category from README if not set
            if readme_meta.get("category") and meta.get("category") == "open source project":
                meta["category"] = readme_meta["category"]
            meta["source_files"].append("README.md")

    # Fallback: use directory name
    if not meta["name"]:
        meta["name"] = path.name

    return meta
