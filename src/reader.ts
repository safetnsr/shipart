import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ProjectInfo } from './types.js';

function tryRead(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  } catch {
    return null;
  }
}

function extractFromPackageJson(content: string): Partial<ProjectInfo> {
  try {
    const pkg = JSON.parse(content);
    const name = pkg.name?.replace(/^@[^/]+\//, '') ?? '';
    const description = pkg.description ?? '';
    const keywords: string[] = pkg.keywords ?? [];

    // Extract main deps for tech stack
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    const knownFrameworks: Record<string, string> = {
      react: 'React',
      vue: 'Vue',
      svelte: 'Svelte',
      angular: 'Angular',
      next: 'Next.js',
      nuxt: 'Nuxt',
      express: 'Express',
      fastify: 'Fastify',
      hono: 'Hono',
      koa: 'Koa',
      nestjs: 'NestJS',
      prisma: 'Prisma',
      drizzle: 'Drizzle',
      zod: 'Zod',
      trpc: 'tRPC',
      commander: 'CLI',
      yargs: 'CLI',
      click: 'CLI',
      axios: 'Axios',
      graphql: 'GraphQL',
      postgres: 'PostgreSQL',
      mysql: 'MySQL',
      redis: 'Redis',
      sqlite: 'SQLite',
      typescript: 'TypeScript',
      webpack: 'Webpack',
      vite: 'Vite',
      esbuild: 'esbuild',
    };

    const techStack: string[] = ['Node.js'];
    if (allDeps['typescript'] || pkg.devDependencies?.['typescript']) {
      techStack.push('TypeScript');
    }

    for (const [dep, label] of Object.entries(knownFrameworks)) {
      if (dep === 'typescript') continue;
      for (const key of Object.keys(allDeps)) {
        if (key === dep || key.includes(dep)) {
          if (!techStack.includes(label)) techStack.push(label);
          break;
        }
      }
    }

    return { name, description, keywords, techStack };
  } catch {
    return {};
  }
}

function extractFromPyproject(content: string): Partial<ProjectInfo> {
  const name = content.match(/^name\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const description = content.match(/^description\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const keywords = content.match(/^keywords\s*=\s*\[([^\]]+)\]/m)?.[1]
    ?.split(',')
    .map((k) => k.trim().replace(/['"]/g, ''))
    .filter(Boolean) ?? [];

  return {
    name,
    description,
    keywords,
    techStack: ['Python'],
    language: 'Python',
  };
}

function extractFromCargoToml(content: string): Partial<ProjectInfo> {
  const name = content.match(/^name\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const description = content.match(/^description\s*=\s*"([^"]+)"/m)?.[1] ?? '';

  return {
    name,
    description,
    techStack: ['Rust'],
    language: 'Rust',
    keywords: [],
  };
}

function extractFromGoMod(content: string): Partial<ProjectInfo> {
  const name = content.match(/^module\s+(\S+)/m)?.[1]?.split('/').pop() ?? '';
  return {
    name,
    techStack: ['Go'],
    language: 'Go',
    keywords: [],
  };
}

function extractFromReadme(content: string): Partial<ProjectInfo> {
  // First H1
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';

  // First non-empty paragraph after H1
  const lines = content.split('\n');
  let description = '';
  let pastH1 = false;
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.match(/^#\s+/)) {
      pastH1 = true;
      continue;
    }
    if (pastH1 && line.trim() && !line.startsWith('#') && !line.startsWith('!')) {
      description = line.trim().replace(/\*\*|__|\*|_/g, '');
      break;
    }
  }

  // Extract tech from code block languages
  const codeLanguages: string[] = [];
  const codeBlockRegex = /```(\w+)/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1].toLowerCase();
    if (!['bash', 'sh', 'shell', 'text', 'plain', 'output'].includes(lang)) {
      codeLanguages.push(lang);
    }
  }

  return {
    name: h1,
    description,
    techStack: [...new Set(codeLanguages)].slice(0, 5),
  };
}

function detectCategory(info: Partial<ProjectInfo>): string {
  const text = [info.name, info.description, ...(info.keywords ?? []), ...(info.techStack ?? [])]
    .join(' ')
    .toLowerCase();

  if (text.includes('cli') || text.includes('command line') || text.includes('terminal')) return 'CLI tool';
  if (text.includes('api') || text.includes('server') || text.includes('backend')) return 'API / backend';
  if (text.includes('plugin') || text.includes('extension')) return 'Plugin / extension';
  if (text.includes('library') || text.includes('lib') || text.includes('sdk')) return 'Library / SDK';
  if (text.includes('dashboard') || text.includes('ui') || text.includes('frontend')) return 'Web app';
  if (text.includes('bot') || text.includes('agent')) return 'Bot / agent';
  if (text.includes('tool') || text.includes('util')) return 'Developer tool';
  return 'open source project';
}

export function readProject(projectPath: string): ProjectInfo {
  const dir = resolve(projectPath);

  const packageJson = tryRead(join(dir, 'package.json'));
  const pyproject = tryRead(join(dir, 'pyproject.toml'));
  const cargoToml = tryRead(join(dir, 'Cargo.toml'));
  const goMod = tryRead(join(dir, 'go.mod'));
  const readme = tryRead(join(dir, 'README.md')) ?? tryRead(join(dir, 'readme.md'));

  let info: Partial<ProjectInfo> = {};

  if (packageJson) {
    info = { ...info, ...extractFromPackageJson(packageJson) };
  } else if (pyproject) {
    info = { ...info, ...extractFromPyproject(pyproject) };
  } else if (cargoToml) {
    info = { ...info, ...extractFromCargoToml(cargoToml) };
  } else if (goMod) {
    info = { ...info, ...extractFromGoMod(goMod) };
  }

  if (readme) {
    const readmeInfo = extractFromReadme(readme);
    // README fills gaps — don't override good package.json data
    if (!info.name && readmeInfo.name) info.name = readmeInfo.name;
    if (!info.description && readmeInfo.description) info.description = readmeInfo.description;
    if (readmeInfo.techStack?.length && !info.techStack?.length) {
      info.techStack = readmeInfo.techStack;
    }
  }

  // Fallback: use directory name
  if (!info.name) {
    info.name = dir.split('/').pop() ?? 'project';
  }

  const result: ProjectInfo = {
    name: info.name ?? 'project',
    description: info.description ?? 'an open source project',
    techStack: info.techStack ?? [],
    keywords: info.keywords ?? [],
    language: info.language ?? (packageJson ? 'TypeScript/JavaScript' : 'unknown'),
    category: '',
  };

  result.category = detectCategory(result);
  return result;
}
