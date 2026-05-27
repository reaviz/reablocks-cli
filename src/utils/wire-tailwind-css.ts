import fs from "fs-extra";
import path from "path";
import { Framework } from "../types";
import { REABLOCKS_THEME_TOKENS } from "./reablocks-theme-tokens";

const NEXT_APP_CSS = ["src/app/globals.css", "app/globals.css"];
const NEXT_PAGES_CSS = ["src/styles/globals.css", "styles/globals.css"];
const VITE_CSS = [
  "src/index.css",
  "src/styles.css",
  "src/main.css",
  "src/App.css",
];
const CRA_CSS = ["src/index.css", "src/App.css", "src/styles.css"];
const REACT_ROUTER_CSS = [
  "app/app.css",
  "app/tailwind.css",
  "app/styles.css",
  "app/globals.css",
];
const REFINE_CSS = ["src/index.css", "src/styles.css", "src/App.css"];
const REDWOOD_CSS = ["web/src/index.css", "web/src/scaffold.css"];

const ALL_CSS = Array.from(
  new Set([
    ...NEXT_APP_CSS,
    ...NEXT_PAGES_CSS,
    ...REACT_ROUTER_CSS,
    ...VITE_CSS,
    ...CRA_CSS,
    ...REFINE_CSS,
    ...REDWOOD_CSS,
  ])
);

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(candidate))) {
      return candidate;
    }
  }
  return null;
}

export function findCssFile(framework: Framework): string | null {
  switch (framework) {
    case "next":
      return firstExisting(NEXT_APP_CSS) ?? firstExisting(NEXT_PAGES_CSS);
    case "vite":
      return firstExisting(VITE_CSS);
    case "react-router":
      return firstExisting(REACT_ROUTER_CSS);
    case "cra":
      return firstExisting(CRA_CSS);
    case "refine":
      return firstExisting(REFINE_CSS);
    case "redwood":
      return firstExisting(REDWOOD_CSS);
    case "other":
    default:
      return firstExisting(ALL_CSS);
  }
}

export interface CssWireResult {
  changed: boolean;
  filePath: string;
  newContent: string;
  snippet?: string;
  message?: string;
}

const TAILWIND_IMPORT = `@import "tailwindcss";`;
const REABLOCKS_SOURCE = `@source "../node_modules/reablocks";`;
const TOKENS_SUMMARY =
  "/* + reablocks theme tokens: :root color palette, @custom-variant dark/light/disabled-within, @theme inline + @theme static (marker --reablocks-theme) */";

function alreadyHasTailwindImport(content: string): boolean {
  return /@import\s+['"]tailwindcss['"]/.test(content);
}

function alreadyHasReablocksSource(content: string): boolean {
  return /@source\s+['"][^'"]*reablocks['"]/.test(content);
}

function alreadyHasReablocksTokens(content: string): boolean {
  return /--reablocks-theme\s*:/.test(content);
}

export function buildCssWire(
  filePath: string,
  content: string
): CssWireResult {
  const hasTw = alreadyHasTailwindImport(content);
  const hasReablocks = alreadyHasReablocksSource(content);
  const hasTokens = alreadyHasReablocksTokens(content);

  if (hasTw && hasReablocks && hasTokens) {
    return {
      changed: false,
      filePath,
      newContent: content,
      message:
        "Tailwind v4 + reablocks @source + theme tokens already configured.",
    };
  }

  let working = content;
  const snippetParts: string[] = [];

  // 1. Ensure @import "tailwindcss"; is present at the top.
  if (!hasTw) {
    const separator = working.startsWith("\n") ? "\n" : "\n\n";
    working = TAILWIND_IMPORT + separator + working;
    snippetParts.push(TAILWIND_IMPORT);
  }

  // 2. Ensure @source "...reablocks"; sits right after @import.
  if (!hasReablocks) {
    const importMatch = /@import\s+['"]tailwindcss['"];?[ \t]*\n?/.exec(
      working
    );
    if (importMatch) {
      const insertPos = importMatch.index + importMatch[0].length;
      const needsLeadingNewline = !importMatch[0].endsWith("\n");
      const insertion =
        (needsLeadingNewline ? "\n" : "") + REABLOCKS_SOURCE + "\n";
      working =
        working.slice(0, insertPos) + insertion + working.slice(insertPos);
    } else {
      // Defensive: @import was either present originally or just prepended,
      // so this branch is unreachable in practice — kept so a future regex
      // tweak can't silently lose the @source insertion.
      working = REABLOCKS_SOURCE + "\n" + working;
    }
    snippetParts.push(REABLOCKS_SOURCE);
  }

  // 3. Ensure the reablocks theme tokens block sits right after @source.
  if (!hasTokens) {
    const sourceMatch = /@source\s+['"][^'"]*reablocks['"];?[ \t]*\n?/.exec(
      working
    );
    if (sourceMatch) {
      const insertPos = sourceMatch.index + sourceMatch[0].length;
      const needsLeadingNewline = !sourceMatch[0].endsWith("\n");
      const insertion =
        (needsLeadingNewline ? "\n" : "") + "\n" + REABLOCKS_THEME_TOKENS;
      working =
        working.slice(0, insertPos) + insertion + working.slice(insertPos);
    } else {
      // Defensive: symmetric with the @source branch above — @source has just
      // been inserted (or was already present), so this is a safety net.
      working = REABLOCKS_THEME_TOKENS + "\n" + working;
    }
    snippetParts.push(TOKENS_SUMMARY);
  }

  return {
    changed: true,
    filePath,
    newContent: working,
    snippet: snippetParts.join("\n"),
  };
}

export function tailwindCssInstructions(): string {
  return [
    "Add Tailwind v4 + reablocks to your main stylesheet:",
    "",
    `  ${TAILWIND_IMPORT}`,
    `  ${REABLOCKS_SOURCE}`,
    "",
    "Plus the reablocks color palette + `@custom-variant` rules + `@theme inline` / `@theme static` token blocks.",
    "Full block: https://reablocks.dev/docs/getting-started/setup",
  ].join("\n");
}
