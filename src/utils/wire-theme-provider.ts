import path from "path";
import fs from "fs-extra";
import { EntryFile } from "./find-entry-file";

const IMPORT_LINE = `import { ThemeProvider, theme } from 'reablocks';`;

export interface FileWrite {
  path: string;
  content: string;
}

export interface WireResult {
  changed: boolean;
  primary: FileWrite;
  additional?: FileWrite[];
  snippetPreview?: string;
  message?: string;
}

function alreadyHasThemeProvider(content: string): boolean {
  return /\bThemeProvider\b/.test(content) && /['"]reablocks['"]/.test(content);
}

function alreadyHasProvidersImport(content: string): boolean {
  return /from\s+['"]\.\/providers['"]/.test(content);
}

function addImport(content: string, importLine: string): string {
  if (content.includes(importLine)) {
    return content;
  }

  const importRegex = /^import\s[^\n]*?;?$/gm;
  let lastEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    lastEnd = match.index + match[0].length;
  }

  if (lastEnd >= 0) {
    return (
      content.slice(0, lastEnd) + "\n" + importLine + content.slice(lastEnd)
    );
  }

  // No existing imports — preserve a leading "use client" / "use server" if present.
  const directiveMatch = content.match(
    /^(\s*['"]use (?:client|server)['"];?\s*\n)/
  );
  if (directiveMatch) {
    const end = directiveMatch[0].length;
    return (
      content.slice(0, end) + "\n" + importLine + "\n" + content.slice(end)
    );
  }

  return importLine + "\n\n" + content;
}

function indentOfPosition(content: string, idx: number): string {
  let lineStart = content.lastIndexOf("\n", idx - 1);
  lineStart = lineStart === -1 ? 0 : lineStart + 1;
  let i = lineStart;
  let indent = "";
  while (i < content.length && (content[i] === " " || content[i] === "\t")) {
    indent += content[i];
    i++;
  }
  return indent;
}

interface JsxBlock {
  start: number;
  end: number;
  text: string;
}

function findJsxBlock(content: string, tagName: string): JsxBlock | null {
  const selfClosing = new RegExp(`<${tagName}\\b[^>]*?\\s*/>`);
  const sm = selfClosing.exec(content);
  if (sm) {
    return { start: sm.index, end: sm.index + sm[0].length, text: sm[0] };
  }

  const paired = new RegExp(`<${tagName}\\b[^>]*?>[\\s\\S]*?</${tagName}>`);
  const pm = paired.exec(content);
  if (pm) {
    return { start: pm.index, end: pm.index + pm[0].length, text: pm[0] };
  }

  return null;
}

function wrapBlock(
  content: string,
  block: JsxBlock,
  wrapperOpen: string,
  wrapperClose: string
): { newContent: string; snippet: string } {
  const indent = indentOfPosition(content, block.start);
  const inner = block.text;
  const wrapped =
    `${wrapperOpen}\n` +
    `${indent}  ${inner}\n` +
    `${indent}${wrapperClose}`;

  const newContent =
    content.slice(0, block.start) + wrapped + content.slice(block.end);

  return { newContent, snippet: wrapped };
}

function wireReactRoot(entryPath: string, content: string): WireResult {
  if (alreadyHasThemeProvider(content)) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: "ThemeProvider already imported in this file.",
    };
  }

  for (const name of ["App", "Root", "Main"]) {
    const block = findJsxBlock(content, name);
    if (!block) continue;

    const withImport = addImport(content, IMPORT_LINE);
    const importOffset = withImport.length - content.length;
    const adjustedBlock: JsxBlock = {
      start: block.start + importOffset,
      end: block.end + importOffset,
      text: block.text,
    };

    const { newContent, snippet } = wrapBlock(
      withImport,
      adjustedBlock,
      "<ThemeProvider theme={theme}>",
      "</ThemeProvider>"
    );

    return {
      changed: true,
      primary: { path: entryPath, content: newContent },
      snippetPreview: snippet,
    };
  }

  return {
    changed: false,
    primary: { path: entryPath, content },
    message: `Could not locate <App />, <Root />, or <Main /> in ${entryPath}.`,
  };
}

function wireNextPagesApp(entryPath: string, content: string): WireResult {
  if (alreadyHasThemeProvider(content)) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: "ThemeProvider already imported in this file.",
    };
  }

  const block = findJsxBlock(content, "Component");
  if (!block) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: `Could not locate <Component ... /> in ${entryPath}.`,
    };
  }

  const withImport = addImport(content, IMPORT_LINE);
  const importOffset = withImport.length - content.length;
  const adjustedBlock: JsxBlock = {
    start: block.start + importOffset,
    end: block.end + importOffset,
    text: block.text,
  };

  const { newContent, snippet } = wrapBlock(
    withImport,
    adjustedBlock,
    "<ThemeProvider theme={theme}>",
    "</ThemeProvider>"
  );

  return {
    changed: true,
    primary: { path: entryPath, content: newContent },
    snippetPreview: snippet,
  };
}

function buildProvidersFile(entryPath: string): FileWrite {
  const isTs = entryPath.endsWith(".tsx") || entryPath.endsWith(".ts");
  const ext = isTs ? "tsx" : "jsx";
  const filePath = path.join(path.dirname(entryPath), `providers.${ext}`);

  const tsContent = `'use client';

import { ThemeProvider, theme } from 'reablocks';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
`;

  const jsContent = `'use client';

import { ThemeProvider, theme } from 'reablocks';

export function Providers({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
`;

  return { path: filePath, content: isTs ? tsContent : jsContent };
}

function wireReactRouterRoot(entryPath: string, content: string): WireResult {
  if (alreadyHasThemeProvider(content)) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: "ThemeProvider already imported in this file.",
    };
  }

  const childrenIdx = content.indexOf("{children}");
  if (childrenIdx === -1) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: `Could not locate {children} in ${entryPath}.`,
    };
  }

  const withImport = addImport(content, IMPORT_LINE);
  const offset = withImport.length - content.length;
  const adjustedStart = childrenIdx + offset;
  const adjustedBlock: JsxBlock = {
    start: adjustedStart,
    end: adjustedStart + "{children}".length,
    text: "{children}",
  };

  const { newContent, snippet } = wrapBlock(
    withImport,
    adjustedBlock,
    "<ThemeProvider theme={theme}>",
    "</ThemeProvider>"
  );

  return {
    changed: true,
    primary: { path: entryPath, content: newContent },
    snippetPreview: snippet,
  };
}

function existingProvidersFile(entryPath: string): string | null {
  const dir = path.dirname(entryPath);
  for (const ext of ["tsx", "jsx", "ts", "js"]) {
    const candidate = path.join(dir, `providers.${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function wireNextAppLayout(entryPath: string, content: string): WireResult {
  if (alreadyHasProvidersImport(content) || alreadyHasThemeProvider(content)) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: "Providers / ThemeProvider already wired up in this layout.",
    };
  }

  const childrenIdx = content.indexOf("{children}");
  if (childrenIdx === -1) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: `Could not locate {children} in ${entryPath}.`,
    };
  }

  // Don't clobber a hand-written providers file. If one exists next to the
  // layout, bail out with manual instructions — the user likely already
  // has a Providers component for other context (TanStack Query, theming,
  // i18n, etc.) and we don't want to overwrite it.
  const existing = existingProvidersFile(entryPath);
  if (existing) {
    return {
      changed: false,
      primary: { path: entryPath, content },
      message: `Found existing ${existing}; not overwriting. Wrap your existing Providers with <ThemeProvider theme={theme}> manually and re-run init.`,
    };
  }

  const providersFile = buildProvidersFile(entryPath);
  const withImport = addImport(
    content,
    `import { Providers } from './providers';`
  );

  const offset = withImport.length - content.length;
  const wrappedIdx = childrenIdx + offset;
  const wrappedSnippet = "<Providers>{children}</Providers>";

  const newContent =
    withImport.slice(0, wrappedIdx) +
    wrappedSnippet +
    withImport.slice(wrappedIdx + "{children}".length);

  return {
    changed: true,
    primary: { path: entryPath, content: newContent },
    additional: [providersFile],
    snippetPreview: wrappedSnippet,
  };
}

export function wireThemeProvider(
  entry: EntryFile,
  content: string
): WireResult {
  switch (entry.kind) {
    case "next-app-layout":
      return wireNextAppLayout(entry.path, content);
    case "next-pages-app":
      return wireNextPagesApp(entry.path, content);
    case "react-router-root":
      return wireReactRouterRoot(entry.path, content);
    case "react-root":
      return wireReactRoot(entry.path, content);
  }
}

export function themeProviderInstructions(): string {
  return [
    "Wrap your app root with <ThemeProvider theme={theme}>:",
    "",
    "  import { ThemeProvider, theme } from 'reablocks';",
    "",
    "  export const App = () => (",
    "    <ThemeProvider theme={theme}>",
    "      <YourComponents />",
    "    </ThemeProvider>",
    "  );",
    "",
    "Reference: https://reablocks.dev/docs/getting-started/setup",
  ].join("\n");
}
