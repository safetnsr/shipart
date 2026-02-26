"""cli.py — shipart CLI entry point."""

import sys
from pathlib import Path

import click

from .generator import generate_variations, get_api_key
from .reader import read_project
from .themes import THEMES, build_prompt


@click.command()
@click.argument("path", default=".", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--theme", "-t", default="terminal-dark",
              type=click.Choice(["terminal-dark", "minimal", "bold"]),
              help="Visual theme (default: terminal-dark)")
@click.option("--variations", "-n", default=1, metavar="N",
              help="Number of variations to generate (1-3, default: 1)")
@click.option("--patch-readme", is_flag=True,
              help="Prepend banner image to README.md")
@click.option("--dry-run", is_flag=True,
              help="Print the prompt without generating")
@click.option("--verbose/--quiet", default=True,
              help="Verbose output (default: on)")
@click.version_option()
def main(path: Path, theme: str, variations: int, patch_readme: bool, dry_run: bool, verbose: bool):
    """
    Generate README hero images for open source projects.

    PATH is the project directory (default: current directory).

    \b
    Examples:
      shipart .                          # generate banner for current project
      shipart ./myproject --theme bold   # bold theme
      shipart . --variations 3           # generate 3 variations
      shipart . --patch-readme           # also update README.md
    """
    path = path.resolve()

    if verbose:
        click.echo(f"shipart → {path}")

    # Read project metadata
    meta = read_project(path)

    if verbose:
        click.echo(f"  name:        {meta['name']}")
        click.echo(f"  description: {meta['description'] or '(none found)'}")
        click.echo(f"  category:    {meta['category']}")
        if meta["tech"]:
            click.echo(f"  tech:        {', '.join(meta['tech'][:5])}")
        click.echo(f"  sources:     {', '.join(meta['source_files']) or 'none'}")
        click.echo(f"  theme:       {theme}")

    # Build prompt
    prompt = build_prompt(meta, theme)

    if dry_run:
        click.echo("\n--- prompt ---")
        click.echo(prompt)
        return

    if verbose:
        click.echo("")

    # Get API key
    try:
        api_key = get_api_key()
    except SystemExit:
        sys.exit(1)

    # Generate
    variations = max(1, min(variations, 3))
    results = generate_variations(prompt, path, n=variations, api_key=api_key, verbose=verbose)

    if not results:
        click.echo("error: no banners generated", err=True)
        sys.exit(1)

    # Patch README if requested
    if patch_readme:
        readme_path = path / "README.md"
        if results:
            banner_file = results[0].name
            img_tag = f"![{meta['name']}](./{banner_file})\n\n"

            if readme_path.exists():
                content = readme_path.read_text(encoding="utf-8")
                if img_tag.strip() not in content:
                    # Insert after first H1 if present
                    lines = content.splitlines(keepends=True)
                    insert_at = 0
                    for i, line in enumerate(lines):
                        if line.startswith("# "):
                            insert_at = i + 1
                            break
                    lines.insert(insert_at, "\n" + img_tag)
                    readme_path.write_text("".join(lines), encoding="utf-8")
                    if verbose:
                        click.echo(f"  patched README.md with banner reference")
                else:
                    if verbose:
                        click.echo("  README.md already has banner reference")
            else:
                readme_path.write_text(img_tag, encoding="utf-8")
                if verbose:
                    click.echo("  created README.md with banner reference")

    if verbose:
        click.echo(f"\ndone. {len(results)} banner(s) generated.")
        for r in results:
            click.echo(f"  → {r}")
