import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function loadExtractor() {
  const { extractFromCss } = await import('../src/extractor.ts');
  return { extractFromCss };
}

describe('extractFromCss', async () => {
  const { extractFromCss } = await loadExtractor();

  it('extracts CSS custom properties', () => {
    const dir = join(tmpdir(), `shipart-css-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const cssPath = join(dir, 'styles.css');
    writeFileSync(cssPath, `
      :root {
        --primary: #6366f1;
        --background: #ffffff;
        --foreground: #111111;
        --accent: #f43f5e;
      }
    `);

    const result = extractFromCss(cssPath);
    assert.ok(result.includes('--primary'), `should contain --primary: ${result}`);
    assert.ok(result.includes('#6366f1'), `should contain color value`);
    assert.ok(result.includes('--background'), `should contain --background`);
    rmSync(dir, { recursive: true });
  });

  it('handles file with no color variables gracefully', () => {
    const dir = join(tmpdir(), `shipart-css-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const cssPath = join(dir, 'empty.css');
    writeFileSync(cssPath, `body { font-size: 16px; }\n`);

    const result = extractFromCss(cssPath);
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    rmSync(dir, { recursive: true });
  });

  it('extracts multiple variables', () => {
    const dir = join(tmpdir(), `shipart-css-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const cssPath = join(dir, 'multi.css');
    writeFileSync(cssPath, `
      :root {
        --primary: #0070f3;
        --secondary: #7928ca;
        --accent: #ff0080;
        --background: #000000;
        --foreground: #ffffff;
        --muted: #888888;
        --border: #333333;
      }
    `);

    const result = extractFromCss(cssPath);
    assert.ok(result.includes('--primary'));
    assert.ok(result.includes('--accent'));
    rmSync(dir, { recursive: true });
  });
});
