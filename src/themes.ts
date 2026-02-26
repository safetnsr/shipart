import type { ThemeSpec } from './types.js';

export const BUILT_IN_THEMES: Record<string, ThemeSpec> = {
  'terminal-dark': {
    name: 'terminal-dark',
    description: 'Pure black terminal aesthetic',
    style: `
Style: terminal-dark aesthetic.
- Pure black background (#000000)
- White and bright green monospace text (#ffffff, #00ff41)
- Terminal/console window aesthetic with subtle scanlines
- Monospace font (like JetBrains Mono or Fira Code)
- Sharp corners, no rounded edges
- Optional: faint grid or dot pattern overlay
- Minimal decorative elements — only what a terminal would show
- High contrast, technical, hacker aesthetic
- Subtle glow effects on text
`.trim(),
  },

  minimal: {
    name: 'minimal',
    description: 'Clean white background, lots of negative space',
    style: `
Style: minimal / editorial aesthetic.
- Clean white or off-white background (#ffffff or #fafafa)
- Black or very dark gray typography (#111111, #333333)
- Lots of negative space — resist filling it
- Sans-serif font, clean proportions
- Thin hairline dividers if any
- No decorative elements — pure typography and geometry
- Swiss / Helvetica influenced design
- Like a well-designed product landing page header
`.trim(),
  },

  bold: {
    name: 'bold',
    description: 'High-contrast, vibrant, large typography',
    style: `
Style: bold / high-impact aesthetic.
- Vibrant, saturated background color (electric blue, hot coral, acid green — pick one that fits the project)
- White or near-white text on dark, or dark text on bright
- Very large, heavy typography — condensed or display weight
- High contrast, maximum visual impact
- Minimal elements but BIG
- Like a concert poster or bold magazine cover
- Strong geometric shapes as background elements
`.trim(),
  },

  gradient: {
    name: 'gradient',
    description: 'Dark gradient, deep blue to purple, modern SaaS',
    style: `
Style: modern SaaS / dark gradient aesthetic.
- Dark gradient background: deep navy blue (#0a0a2e) to deep purple (#1a0a2e) to violet (#2d1b69)
- White and light lavender text (#ffffff, #c4b5fd)
- Modern sans-serif, slightly futuristic but clean
- Subtle mesh or aurora-like highlights in the gradient
- Glassmorphism-adjacent: frosted glass card elements if appropriate
- Like Vercel, Linear, or Raycast landing pages
- Depth and dimensionality without being busy
`.trim(),
  },

  retro: {
    name: 'retro',
    description: 'Pixel art / 8-bit aesthetic, bright colors on dark',
    style: `
Style: retro / 8-bit / pixel art aesthetic.
- Dark background (#1a1a2e or deep dark blue)
- Bright, saturated pixel colors: magenta, cyan, yellow, lime green
- Pixel art style elements and typography (chunky, pixelated)
- Like a vintage arcade game screen or ZX Spectrum aesthetic
- Optional: CRT scanline overlay, pixel grid
- Dithering patterns, blocky gradients
- Nostalgic but charming
- Think: early 80s home computer aesthetic meets modern design
`.trim(),
  },

  paper: {
    name: 'paper',
    description: 'Off-white, editorial, blog/writing feel',
    style: `
Style: paper / editorial / print aesthetic.
- Off-white or cream background (#f5f0e8, #fdf6e3, or similar warm paper tone)
- Dark ink-like text (#2c2c2c, #1a1a1a)
- Subtle paper texture feel (implied, not photorealistic)
- Serif or elegant sans-serif typography
- Like a well-designed literary magazine or technical book
- Understated, timeless, print-inspired
- Maybe a thin ruled line or column structure
- Warm, inviting, trustworthy aesthetic
`.trim(),
  },
};

export function getTheme(name: string): ThemeSpec | null {
  return BUILT_IN_THEMES[name] ?? null;
}

export function listThemes(): string[] {
  return Object.keys(BUILT_IN_THEMES);
}
