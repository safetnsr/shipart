export interface ProjectInfo {
  name: string;
  description: string;
  techStack: string[];
  category: string;
  keywords: string[];
  language: string;
}

export interface ThemeSpec {
  name: string;
  description: string;
  style: string;
}

export interface GenerateOptions {
  path: string;
  theme?: string;
  themeFromUrl?: string;
  themeFromCss?: string;
  themePrompt?: string;
  variations: number;
  output: string;
  patchReadme: boolean;
  dryRun: boolean;
}

export interface ColorInfo {
  hex: string;
  r: number;
  g: number;
  b: number;
  prominence: number;
}

export interface ExtractedTheme {
  colors: ColorInfo[];
  isDark: boolean;
  isMinimal: boolean;
  description: string;
}
