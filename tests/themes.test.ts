import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

async function loadThemes() {
  const { getTheme, listThemes, BUILT_IN_THEMES } = await import('../src/themes.ts');
  return { getTheme, listThemes, BUILT_IN_THEMES };
}

describe('built-in themes', async () => {
  const { getTheme, listThemes, BUILT_IN_THEMES } = await loadThemes();

  it('has at least 6 built-in themes', () => {
    const themes = listThemes();
    assert.ok(themes.length >= 6, `expected >=6 themes, got ${themes.length}: ${themes.join(', ')}`);
  });

  it('has all required themes', () => {
    const required = ['terminal-dark', 'minimal', 'bold', 'gradient', 'retro', 'paper'];
    for (const name of required) {
      assert.ok(listThemes().includes(name), `missing theme: ${name}`);
    }
  });

  it('getTheme returns valid spec', () => {
    const theme = getTheme('terminal-dark');
    assert.ok(theme !== null);
    assert.ok(theme!.name === 'terminal-dark');
    assert.ok(theme!.style.length > 20, 'style should be non-trivial');
    assert.ok(theme!.description.length > 5);
  });

  it('getTheme returns null for unknown theme', () => {
    const theme = getTheme('nonexistent-theme-xyz');
    assert.equal(theme, null);
  });

  it('all themes have non-empty style', () => {
    for (const [name, spec] of Object.entries(BUILT_IN_THEMES)) {
      assert.ok(spec.style.trim().length > 20, `theme ${name} has empty/short style`);
      assert.ok(spec.description.length > 5, `theme ${name} has no description`);
    }
  });
});
