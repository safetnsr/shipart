import { readFileSync } from 'node:fs';
import type { ColorInfo, ExtractedTheme } from './types.js';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function colorDistance(a: ColorInfo, b: ColorInfo): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function buildThemeDescription(colors: ColorInfo[], isDark: boolean, isMinimal: boolean): string {
  const colorHexes = colors.map((c) => c.hex).join(', ');
  const brightness = isDark ? 'dark' : 'light';
  const density = isMinimal ? 'minimal / lots of whitespace' : 'information-dense';
  const dominantLum = luminance(colors[0]?.r ?? 128, colors[0]?.g ?? 128, colors[0]?.b ?? 128);
  const accent = colors.find((c) => {
    const sat =
      Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    return sat > 60;
  });

  let desc = `Custom theme extracted from project.\n`;
  desc += `Color palette: ${colorHexes}.\n`;
  desc += `Overall tone: ${brightness} background, ${density} layout.\n`;
  if (accent) {
    desc += `Accent color: ${accent.hex} — use this for highlights, emphasis, and key text.\n`;
  }
  desc += `Background luminance: ${Math.round(dominantLum)}/255.\n`;
  desc += `Match the visual style and color feel of the source project.`;

  return desc;
}

export async function extractFromScreenshot(screenshotPath: string): Promise<ExtractedTheme> {
  let sharp: typeof import('sharp');
  try {
    sharp = (await import('sharp')).default as unknown as typeof import('sharp');
  } catch {
    throw new Error('sharp is required for color extraction. Run: npm install sharp');
  }

  const image = sharp(screenshotPath);
  const { data, info } = await image
    .resize(100, 56, { fit: 'cover' }) // downsample for speed
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels as number;
  const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += channels) {
    // Quantize to reduce noise
    const r = Math.round((data[i] ?? 0) / 16) * 16;
    const g = Math.round((data[i + 1] ?? 0) / 16) * 16;
    const b = Math.round((data[i + 2] ?? 0) / 16) * 16;
    const key = `${r},${g},${b}`;
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort by frequency
  const sorted = [...colorMap.values()].sort((a, b) => b.count - a.count);

  // Pick diverse top colors
  const topColors: ColorInfo[] = [];
  for (const entry of sorted) {
    if (topColors.length >= 5) break;
    const ci: ColorInfo = {
      r: entry.r,
      g: entry.g,
      b: entry.b,
      hex: rgbToHex(entry.r, entry.g, entry.b),
      prominence: entry.count,
    };
    // Skip if too similar to already picked
    const tooSimilar = topColors.some((existing) => colorDistance(existing, ci) < 30);
    if (!tooSimilar) {
      topColors.push(ci);
    }
  }

  const avgLum =
    topColors.slice(0, 3).reduce((sum, c) => sum + luminance(c.r, c.g, c.b), 0) /
    Math.max(topColors.slice(0, 3).length, 1);

  const isDark = avgLum < 128;
  const pixelCount = info.width * info.height;
  const uniqueRatio = colorMap.size / pixelCount;
  const isMinimal = uniqueRatio < 0.1;

  return {
    colors: topColors,
    isDark,
    isMinimal,
    description: buildThemeDescription(topColors, isDark, isMinimal),
  };
}

export async function screenshotUrl(url: string, outputPath: string): Promise<void> {
  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    throw new Error(
      'playwright is required for --theme-from-url.\n' +
        'Install it: npm install playwright && npx playwright install chromium',
    );
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: outputPath, fullPage: false });
  } finally {
    await browser.close();
  }
}

export function extractFromCss(cssPath: string): string {
  const content = readFileSync(cssPath, 'utf8');

  const vars: Record<string, string> = {};

  // Extract CSS custom properties
  const propRegex = /--([\w-]+)\s*:\s*([^;}\n]+)/g;
  let match;
  while ((match = propRegex.exec(content)) !== null) {
    vars[`--${match[1]}`] = match[2].trim();
  }

  // Also try to extract Tailwind config colors
  const twColorRegex = /['"]?(\w+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8}|rgb[^,)]+\))['"]/g;
  const twColors: string[] = [];
  while ((match = twColorRegex.exec(content)) !== null) {
    twColors.push(`${match[1]}: ${match[2]}`);
  }

  const interestingProps = [
    '--primary', '--secondary', '--accent', '--background', '--foreground',
    '--bg', '--fg', '--color-primary', '--color-accent', '--color-bg',
    '--brand', '--surface', '--muted', '--border', '--ring',
    '--card', '--popover', '--destructive',
  ];

  const extracted: string[] = [];
  for (const prop of interestingProps) {
    if (vars[prop]) {
      extracted.push(`${prop}: ${vars[prop]}`);
    }
  }

  // If no interesting props, grab any color-looking values
  if (extracted.length === 0) {
    for (const [key, val] of Object.entries(vars)) {
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl')) {
        extracted.push(`${key}: ${val}`);
      }
      if (extracted.length >= 10) break;
    }
  }

  let description = '';

  if (extracted.length > 0) {
    description += `CSS variables extracted:\n${extracted.map((e) => `  ${e}`).join('\n')}\n\n`;
  }

  if (twColors.length > 0) {
    description += `Tailwind colors found:\n${twColors.slice(0, 8).map((c) => `  ${c}`).join('\n')}\n\n`;
  }

  if (extracted.length === 0 && twColors.length === 0) {
    description = 'No color variables found in CSS. Using default styling.';
  } else {
    const bgVal = vars['--background'] ?? vars['--bg'] ?? vars['--color-bg'];
    const isDark = bgVal
      ? bgVal.includes('0,0,0') || bgVal === '#000' || bgVal === '#000000' || bgVal.startsWith('#0') || bgVal.startsWith('#1')
      : false;
    description += `Design tone: ${isDark ? 'dark mode' : 'light mode'} based on CSS variables.\n`;
    description += `Use these colors faithfully in the banner design. Match the brand aesthetic.`;
  }

  return description;
}
