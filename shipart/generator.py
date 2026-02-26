"""generator.py — call Nano Banana 2 (gemini-3.1-flash-image-preview) to generate banner images."""

import os
import time
from pathlib import Path
from typing import Optional

MODEL = "gemini-3.1-flash-image-preview"
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds


def _find_api_key() -> Optional[str]:
    """Look for Google AI key in standard locations."""
    # 1. Env var
    key = os.environ.get("GOOGLE_AI_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key.strip()

    # 2. OpenClaw credentials
    openclaw_path = Path.home() / ".openclaw" / "workspace" / ".credentials" / "google_ai_key"
    if openclaw_path.exists():
        return openclaw_path.read_text().strip()

    # 3. shipart config
    config_path = Path.home() / ".config" / "shipart" / "key"
    if config_path.exists():
        return config_path.read_text().strip()

    return None


def get_api_key() -> str:
    """Get API key or prompt user."""
    key = _find_api_key()
    if key:
        return key

    print("\nNo Google AI key found. Set one of:")
    print("  export GOOGLE_AI_KEY=your_key_here")
    print("  echo 'your_key' > ~/.config/shipart/key")
    print("\nGet a key at: https://aistudio.google.com/apikey")
    raise SystemExit(1)


def generate_banner(
    prompt: str,
    output_path: Path,
    api_key: Optional[str] = None,
    verbose: bool = True,
) -> bool:
    """
    Generate a banner image using Nano Banana 2.

    Returns True on success, False on failure.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise SystemExit(
            "google-genai is required. Install it: pip install google-genai"
        )

    if api_key is None:
        api_key = get_api_key()

    client = genai.Client(api_key=api_key)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if verbose:
                print(f"  generating with {MODEL}... (attempt {attempt}/{MAX_RETRIES})")

            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"]
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_bytes(part.inline_data.data)
                    size_kb = len(part.inline_data.data) // 1024
                    if verbose:
                        print(f"  saved → {output_path} ({size_kb} KB)")
                    return True
                elif part.text and verbose:
                    print(f"  model text: {part.text[:200]}")

            if verbose:
                print("  warning: no image in response")
            return False

        except Exception as e:
            err_str = str(e)
            is_rate_limit = "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower()

            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                if is_rate_limit:
                    delay = max(delay, 15)
                if verbose:
                    print(f"  error: {err_str[:120]} — retrying in {delay}s")
                time.sleep(delay)
            else:
                if verbose:
                    print(f"  failed after {MAX_RETRIES} attempts: {err_str[:200]}")
                return False

    return False


def generate_variations(
    prompt: str,
    project_path: Path,
    n: int = 1,
    api_key: Optional[str] = None,
    verbose: bool = True,
) -> list[Path]:
    """
    Generate N banner variations.

    If n == 1: saves as banner.png
    If n > 1: saves as banner-1.png, banner-2.png, etc.
    """
    n = max(1, min(n, 3))
    results = []

    for i in range(1, n + 1):
        if n == 1:
            out = project_path / "banner.png"
        else:
            out = project_path / f"banner-{i}.png"

        if verbose and n > 1:
            print(f"\n[variation {i}/{n}]")

        success = generate_banner(prompt, out, api_key=api_key, verbose=verbose)
        if success:
            results.append(out)

        if i < n:
            time.sleep(3)  # courtesy delay between variations

    return results
