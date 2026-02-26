import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ProjectInfo, ThemeSpec } from './types.js';

function loadApiKey(): string {
  // 1. Env vars
  if (process.env.GOOGLE_AI_KEY) return process.env.GOOGLE_AI_KEY;
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // 2. ~/.openclaw/workspace/.credentials/google_ai_key
  const openclaw = join(homedir(), '.openclaw', 'workspace', '.credentials', 'google_ai_key');
  if (existsSync(openclaw)) {
    const key = readFileSync(openclaw, 'utf8').trim();
    if (key) return key;
  }

  // 3. ~/.config/shipart/key
  const config = join(homedir(), '.config', 'shipart', 'key');
  if (existsSync(config)) {
    const key = readFileSync(config, 'utf8').trim();
    if (key) return key;
  }

  throw new Error(
    'No API key found. Set GOOGLE_AI_KEY env var, or save it to:\n' +
      `  ~/.config/shipart/key\n\n` +
      'Get a free key at: https://aistudio.google.com/apikey',
  );
}

function buildPrompt(project: ProjectInfo, themeStyle: string): string {
  const tech = project.techStack.length > 0 ? project.techStack.join(', ') : project.language;

  return `Generate a professional README hero banner image for an open source project.

Project details:
- Name: ${project.name}
- Description: ${project.description}
- Category: ${project.category}
- Tech stack: ${tech}
${project.keywords.length > 0 ? `- Keywords: ${project.keywords.slice(0, 6).join(', ')}` : ''}

Image requirements:
- Landscape format, 16:9 aspect ratio (1280×640)
- Show the project name prominently: "${project.name}"
- Include a short subtitle or tagline from the description
- Professional, modern, developer-focused aesthetic
- No photorealistic imagery — abstract/geometric/typographic
- No watermarks, no borders, no badges
- Suitable as a GitHub README hero image

${themeStyle}

Generate ONLY the image. No text response needed.`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateBanner(
  project: ProjectInfo,
  theme: ThemeSpec,
  outputPath: string,
  dryRun = false,
): Promise<void> {
  const prompt = buildPrompt(project, theme.style);

  if (dryRun) {
    console.log('\n--- DRY RUN: Prompt ---\n');
    console.log(prompt);
    console.log('\n--- End Prompt ---\n');
    return;
  }

  const apiKey = loadApiKey();

  let genai: typeof import('@google/genai');
  try {
    genai = await import('@google/genai');
  } catch {
    throw new Error('Missing dependency: npm install @google/genai');
  }

  const client = new genai.GoogleGenAI({ apiKey });
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  generating with gemini-3.1-flash-image-preview... (attempt ${attempt}/${maxRetries})`);

      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let imageFound = false;

      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          writeFileSync(outputPath, buffer);
          const sizeKb = Math.round(buffer.length / 1024);
          console.log(`  saved → ${outputPath} (${sizeKb} KB)`);
          imageFound = true;
          break;
        }
      }

      if (!imageFound) {
        const textParts = parts.filter((p) => p.text).map((p) => p.text);
        if (textParts.length > 0) {
          console.warn(`  model returned text instead of image: ${textParts[0]?.slice(0, 200)}`);
        }
        throw new Error('No image in response');
      }

      return; // success
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate');

      if (attempt < maxRetries && isRateLimit) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`  rate limited, retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      if (attempt < maxRetries) {
        const delay = 2000;
        console.log(`  error: ${error?.message ?? String(err)}, retrying in 2s...`);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }
}
