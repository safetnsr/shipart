import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// We test readProject by creating temp dirs
async function loadReader() {
  const { readProject } = await import('../src/reader.ts');
  return { readProject };
}

function createTempProject(files: Record<string, string>): string {
  const dir = join(tmpdir(), `shipart-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

describe('readProject — package.json', async () => {
  const { readProject } = await loadReader();

  it('reads name and description from package.json', () => {
    const dir = createTempProject({
      'package.json': JSON.stringify({
        name: '@scope/myapp',
        description: 'A test application',
        keywords: ['test', 'cli'],
      }),
    });
    const info = readProject(dir);
    assert.equal(info.name, 'myapp');
    assert.equal(info.description, 'A test application');
    assert.deepEqual(info.keywords, ['test', 'cli']);
    rmSync(dir, { recursive: true });
  });

  it('detects CLI category from keywords', () => {
    const dir = createTempProject({
      'package.json': JSON.stringify({
        name: 'mytool',
        description: 'A CLI tool',
        keywords: ['cli'],
        dependencies: { commander: '^12' },
      }),
    });
    const info = readProject(dir);
    assert.ok(info.category.toLowerCase().includes('cli'), `expected CLI category, got: ${info.category}`);
    rmSync(dir, { recursive: true });
  });

  it('detects TypeScript from devDependencies', () => {
    const dir = createTempProject({
      'package.json': JSON.stringify({
        name: 'tsapp',
        description: 'TypeScript app',
        devDependencies: { typescript: '^5' },
      }),
    });
    const info = readProject(dir);
    assert.ok(info.techStack.includes('TypeScript'), `expected TypeScript in tech stack: ${JSON.stringify(info.techStack)}`);
    rmSync(dir, { recursive: true });
  });

  it('falls back to directory name when no name in package.json', () => {
    const dir = createTempProject({
      'package.json': JSON.stringify({ description: 'desc' }),
    });
    const info = readProject(dir);
    // Should use the tmpdir segment name
    assert.ok(info.name.length > 0);
    rmSync(dir, { recursive: true });
  });
});

describe('readProject — README.md fallback', async () => {
  const { readProject } = await loadReader();

  it('reads name from README H1', () => {
    const dir = createTempProject({
      'README.md': '# myproject\n\nA cool project.\n',
    });
    const info = readProject(dir);
    assert.equal(info.name, 'myproject');
    rmSync(dir, { recursive: true });
  });

  it('reads description from first paragraph', () => {
    const dir = createTempProject({
      'README.md': '# tool\n\nThis tool does amazing things.\n\n## install\n',
    });
    const info = readProject(dir);
    assert.ok(info.description.includes('amazing things'));
    rmSync(dir, { recursive: true });
  });
});

describe('readProject — pyproject.toml', async () => {
  const { readProject } = await loadReader();

  it('reads Python project info', () => {
    const dir = createTempProject({
      'pyproject.toml': `[project]\nname = "mypytool"\ndescription = "A Python tool"\nkeywords = ["python", "tool"]\n`,
    });
    const info = readProject(dir);
    assert.equal(info.name, 'mypytool');
    assert.ok(info.techStack.includes('Python'));
    rmSync(dir, { recursive: true });
  });
});
