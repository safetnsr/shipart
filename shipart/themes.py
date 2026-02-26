"""themes.py — theme definitions and prompt builders for shipart."""

from typing import Literal

ThemeName = Literal["terminal-dark", "minimal", "bold"]

THEMES = {
    "terminal-dark": {
        "label": "terminal-dark",
        "style_instructions": """Style: TERMINAL DARK
- Pure black background (#000000)
- White and light gray text only (#ffffff, #e0e0e0, #888888)
- Monospace font feel (like JetBrains Mono or Geist Mono)
- Subtle grid lines or circuit-board traces in dark gray
- Terminal prompt aesthetic — possibly a blinking cursor, command-line feel
- No color gradients, no colorful elements
- Clean geometric shapes, sharp edges
- High contrast, generous negative space
- Abstract technical decoration (dots, grids, thin lines) — no photorealism
- The tool name should look like it could be a terminal command""",
    },
    "minimal": {
        "label": "minimal",
        "style_instructions": """Style: MINIMAL
- Pure white background (#ffffff)
        - Black and dark gray text only (#000000, #222222, #555555)
- Clean sans-serif typography feel
- Lots of white space — minimal decoration
- Thin hairline rules/dividers only
- No gradients, no illustrations
- The tool name should be large, bold, simple
- Tagline in small, elegant text below
- One or two thin geometric accents maximum""",
    },
    "bold": {
        "label": "bold",
        "style_instructions": """Style: BOLD
- High contrast colored background (deep indigo, electric blue, or vivid teal)
- White text for the tool name, bright accent for highlights
- Large, impactful typography — the tool name dominates the composition
- Bold geometric shapes: thick lines, large rectangles, strong diagonals
- Color palette: max 3 colors — background, white, one accent
- Energetic, modern, startup-poster feel
- No photorealism — pure graphic design / poster aesthetic""",
    },
}


def build_prompt(meta: dict, theme: ThemeName = "terminal-dark") -> str:
    """Build a Nano Banana 2 image generation prompt from project metadata."""
    name = meta.get("name") or "unnamed"
    description = meta.get("description") or "a developer tool"
    category = meta.get("category") or "open source project"
    tech = meta.get("tech") or []

    # Trim tech to the 5 most interesting
    tech_str = ", ".join(tech[:5]) if tech else "open source"

    theme_cfg = THEMES.get(theme, THEMES["terminal-dark"])
    style_block = theme_cfg["style_instructions"]

    prompt = f"""Create a README hero image for a developer tool called "{name}".

Tagline: "{description}"
Category: {category}
Tech: {tech_str}

{style_block}

Composition requirements:
- Include the tool name prominently — it should be the first thing the eye sees
- Include the tagline in smaller text below the name
- Aspect ratio: 16:9 (1280x640 pixels)
- No photorealistic elements — abstract/typographic/diagrammatic only
- No watermarks, no borders, no decorative frames
- The image should work as a GitHub README banner — readable at small sizes"""

    return prompt
