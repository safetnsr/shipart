# shipart

your README deserves better than a blank top.

give your open source project a professional hero image in one command. shipart reads your README and package files, builds a smart prompt, and generates a 1280×640 banner using Nano Banana 2 (gemini-3.1-flash-image-preview).

```
$ shipart .

shipart → /home/user/myproject
  name:        myproject
  description: a fast CLI for developers
  category:    CLI tool
  tech:        python, click, httpx
  theme:       terminal-dark

  generating with gemini-3.1-flash-image-preview... (attempt 1/3)
  saved → /home/user/myproject/banner.png (182 KB)

done. 1 banner(s) generated.
  → /home/user/myproject/banner.png
```

![shipart](https://raw.githubusercontent.com/safetnsr/shipart/main/banner.png)

---

## install

```bash
pip install shipart
```

requires a Google AI key (free tier works):

```bash
export GOOGLE_AI_KEY=your_key_here
```

get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

## usage

```bash
# generate banner for current project
shipart .

# specify a different project directory
shipart ./myproject

# choose a theme
shipart . --theme minimal
shipart . --theme bold
shipart . --theme terminal-dark   # default

# generate 3 variations (saves banner-1.png, banner-2.png, banner-3.png)
shipart . --variations 3

# auto-patch README.md to include the banner
shipart . --patch-readme

# preview the prompt without generating
shipart . --dry-run
```

---

## themes

**terminal-dark** (default)
pure black background, white monospace text, terminal aesthetic. built for dark mode README viewers.

![terminal-dark](https://raw.githubusercontent.com/safetnsr/shipart/main/docs/banner-terminal-dark.png)

**minimal**
white background, clean typography, lots of negative space. classic open source look.

![minimal](https://raw.githubusercontent.com/safetnsr/shipart/main/docs/banner-minimal.png)

**bold**
high-contrast, colored background, large impactful typography. stands out in feeds and social previews.

![bold](https://raw.githubusercontent.com/safetnsr/shipart/main/docs/banner-bold.png)

---

## how it works

shipart reads your project directory and extracts:

- **name** — from `package.json`, `pyproject.toml`, `Cargo.toml`, or the first `# H1` in your README
- **description** — from the package file `description` field, or first paragraph in README
- **tech stack** — from dependency lists or code block languages
- **category** — CLI tool, npm package, Python library, Rust crate, etc.

it then builds a detailed prompt and calls `gemini-3.1-flash-image-preview` via the `google-genai` SDK.

supports: `package.json`, `pyproject.toml`, `Cargo.toml`, `README.md`

---

## api key

shipart looks for your key in:

1. `GOOGLE_AI_KEY` environment variable
2. `~/.openclaw/workspace/.credentials/google_ai_key` (openclaw users)
3. `~/.config/shipart/key`
4. prompts you if none found

---

## license

mit
