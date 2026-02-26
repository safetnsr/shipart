import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProject } from './reader.js';
import { generateBanner } from './generator.js';
import { getTheme, listThemes, BUILT_IN_THEMES } from './themes.js';
import { extractFromCss, extractFromScreenshot, screenshotUrl } from './extractor.js';
import type { ThemeSpec } from './types.js';

// Read version from package.json
function getVersion(): string {
  try {
    const pkgPath = join(dirname(new URL(import.meta.url).pathname), '..', 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return pkg.version ?? '2.0.0';
    }
  } catch {}
  return '2.0.0';
}

const program = new Command();

program
  .name('shipart')
  .description('generate README hero images for open source projects using AI')
  .version(getVersion())
  .argument('[path]', 'project directory', '.')
  .option('--theme <name>', 'built-in theme name')
  .option('--theme-from-url <url>', 'screenshot a URL and extract its color palette as theme')
  .option('--theme-from-css <file>', 'extract CSS variables from file and use as theme')
  .option('--theme-prompt <text>', 'free-form theme description')
  .option('--variations <n>', 'number of variations to generate (1-3)', '1')
  .option('--output <path>', 'output file path', './banner.png')
  .option('--patch-readme', 'prepend banner to README.md')
  .option('--dry-run', 'print prompt without generating')
  .option('--list-themes', 'list available built-in themes')
  .action(async (projectPath: string, opts) => {
    if (opts.listThemes) {
      console.log('\navailable themes:\n');
      for (const [name, spec] of Object.entries(BUILT_IN_THEMES)) {
        console.log(`  ${name.padEnd(16)} ${spec.description}`);
      }
      console.log('');
      return;
    }

    const dir = resolve(projectPath);
    const variations = Math.min(3, Math.max(1, parseInt(opts.variations, 10) || 1));

    console.log(`\nshipart → ${dir}`);

    // Read project info
    const project = readProject(dir);
    console.log(`  name:        ${project.name}`);
    console.log(`  description: ${project.description.slice(0, 80)}${project.description.length > 80 ? '...' : ''}`);
    console.log(`  category:    ${project.category}`);
    if (project.techStack.length > 0) {
      console.log(`  tech:        ${project.techStack.join(', ')}`);
    }

    // Resolve theme
    let theme: ThemeSpec;

    if (opts.themeFromUrl) {
      console.log(`  theme:       from URL (${opts.themeFromUrl})`);
      try {
        const tmpPath = join(tmpdir(), `shipart-screenshot-${Date.now()}.png`);
        process.stdout.write('  screenshotting URL...');
        await screenshotUrl(opts.themeFromUrl, tmpPath);
        process.stdout.write(' done\n');
        process.stdout.write('  extracting colors...');
        const extracted = await extractFromScreenshot(tmpPath);
        process.stdout.write(' done\n');
        console.log(`  colors:      ${extracted.colors.map((c) => c.hex).join(', ')}`);
        theme = {
          name: 'url-extracted',
          description: `Extracted from ${opts.themeFromUrl}`,
          style: extracted.description,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\n  error extracting theme from URL: ${msg}`);
        if (msg.includes('playwright')) {
          console.error('  tip: npm install playwright && npx playwright install chromium');
        }
        console.error('  falling back to gradient theme\n');
        theme = getTheme('gradient')!;
      }
    } else if (opts.themeFromCss) {
      console.log(`  theme:       from CSS (${opts.themeFromCss})`);
      try {
        const cssThemeDesc = extractFromCss(opts.themeFromCss);
        theme = {
          name: 'css-extracted',
          description: `Extracted from ${opts.themeFromCss}`,
          style: cssThemeDesc,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  error reading CSS file: ${msg}`);
        console.error('  falling back to minimal theme');
        theme = getTheme('minimal')!;
      }
    } else if (opts.themePrompt) {
      console.log(`  theme:       custom prompt`);
      theme = {
        name: 'custom',
        description: opts.themePrompt,
        style: `Style: ${opts.themePrompt}\n\nApply this aesthetic faithfully to the banner design.`,
      };
    } else if (opts.theme) {
      const found = getTheme(opts.theme);
      if (!found) {
        console.error(`  unknown theme: "${opts.theme}"`);
        console.error(`  available: ${listThemes().join(', ')}`);
        process.exit(1);
      }
      theme = found;
      console.log(`  theme:       ${opts.theme}`);
    } else {
      // Default theme
      theme = getTheme('gradient')!;
      console.log(`  theme:       gradient (default)`);
    }

    console.log('');

    const outputBase = resolve(opts.output);
    const generated: string[] = [];

    for (let i = 1; i <= variations; i++) {
      const outputPath =
        variations === 1
          ? outputBase
          : outputBase.replace(/(\.\w+)$/, `-${i}$1`);

      if (variations > 1) console.log(`  variation ${i}/${variations}:`);

      await generateBanner(project, theme, outputPath, opts.dryRun);

      if (!opts.dryRun) {
        generated.push(outputPath);
      }
    }

    if (!opts.dryRun && generated.length > 0) {
      if (opts.patchReadme) {
        const readmePath = join(dir, 'README.md');
        if (existsSync(readmePath)) {
          let readme = readFileSync(readmePath, 'utf8');
          const imgTag = `![${project.name}](${generated[0]})\n\n`;
          // Remove existing banner line if present
          readme = readme.replace(/^!\[.*?\]\(.*?banner.*?\)\n\n?/m, '');
          readme = imgTag + readme;
          writeFileSync(readmePath, readme);
          console.log(`  patched → ${readmePath}`);
        } else {
          console.warn('  --patch-readme: no README.md found');
        }
      }

      console.log(`\ndone. ${generated.length} banner(s) generated.`);
      for (const p of generated) {
        console.log(`  → ${p}`);
      }
    }

    console.log('');
  });

program.parse();
