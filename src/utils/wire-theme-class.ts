import fs from "fs-extra";
import path from "path";
import { Framework } from "../types";
import { EntryFile } from "./find-entry-file";

export type ThemeChoice = "dark" | "light";

export function themeClassFor(choice: ThemeChoice): string {
  return choice === "light" ? "theme-light" : "theme-dark";
}

export type HtmlHostKind = "jsx-html" | "static-html";

export interface HtmlHost {
  path: string;
  kind: HtmlHostKind;
}

const STATIC_HTML_BY_FRAMEWORK: Record<Framework, string[]> = {
  next: [],
  vite: ["index.html", "public/index.html"],
  "react-router": [],
  refine: ["index.html", "public/index.html"],
  redwood: ["web/src/index.html", "web/index.html"],
  cra: ["public/index.html"],
  other: ["index.html", "public/index.html", "web/src/index.html"],
};

export function findHtmlHost(
  framework: Framework,
  entry: EntryFile | null
): HtmlHost | null {
  if (
    entry &&
    (entry.kind === "next-app-layout" || entry.kind === "react-router-root")
  ) {
    return { path: entry.path, kind: "jsx-html" };
  }

  const candidates = STATIC_HTML_BY_FRAMEWORK[framework] ?? [];
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(candidate))) {
      return { path: candidate, kind: "static-html" };
    }
  }
  return null;
}

export interface ThemeClassResult {
  changed: boolean;
  filePath: string;
  newContent: string;
  snippetPreview?: string;
  message?: string;
  // When set to "manual", the caller should also print the full
  // themeClassInstructions block — we couldn't auto-edit and the user
  // needs the snippet to apply themselves.
  suggestion?: "manual";
}

function hasExistingThemeClass(attrs: string): boolean {
  // Permissive: match theme-dark / theme-light anywhere in the tag's attribute
  // text. Covers class="...", className="...", className={`...`}, etc.
  return /\b(theme-dark|theme-light)\b/.test(attrs);
}

function wireHtmlOpenTag(
  filePath: string,
  content: string,
  themeClass: string,
  attrName: "class" | "className"
): ThemeClassResult {
  const openTag = /<html\b([^>]*)>/i.exec(content);
  if (!openTag) {
    return {
      changed: false,
      filePath,
      newContent: content,
      message: `Could not locate <html> tag in ${filePath}.`,
    };
  }

  const attrs = openTag[1];

  if (hasExistingThemeClass(attrs)) {
    return {
      changed: false,
      filePath,
      newContent: content,
      message: `<html> already has a theme-dark/theme-light class in ${filePath}.`,
    };
  }

  const tagStart = openTag.index;
  const tagEnd = openTag.index + openTag[0].length;
  const finishWith = (newAttrs: string): ThemeClassResult => {
    const newOpenTag = `<html${newAttrs}>`;
    return {
      changed: true,
      filePath,
      newContent: content.slice(0, tagStart) + newOpenTag + content.slice(tagEnd),
      snippetPreview: newOpenTag,
    };
  };

  // 1. Plain string attribute: className="foo" / class="foo"
  const stringAttr = new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`);
  const stringMatch = stringAttr.exec(attrs);
  if (stringMatch) {
    const existing = stringMatch[1];
    const newValue = existing ? `${existing} ${themeClass}` : themeClass;
    return finishWith(attrs.replace(stringAttr, `${attrName}="${newValue}"`));
  }

  // 2. JSX template-literal expression: className={`...`}
  //    Prepend `<themeClass> ` right after the opening backtick so any
  //    ${...} interpolations downstream are preserved.
  if (attrName === "className") {
    const templateLiteral = /className\s*=\s*\{\s*`/;
    const templateMatch = templateLiteral.exec(attrs);
    if (templateMatch) {
      const insertPos = templateMatch.index + templateMatch[0].length;
      const newAttrs =
        attrs.slice(0, insertPos) + `${themeClass} ` + attrs.slice(insertPos);
      return finishWith(newAttrs);
    }

    // 3. JSX string-in-expression: className={"foo"} or className={'foo'}
    const exprString = /className\s*=\s*\{\s*(['"])([^'"]*)\1\s*\}/;
    const exprStringMatch = exprString.exec(attrs);
    if (exprStringMatch) {
      const quote = exprStringMatch[1];
      const existing = exprStringMatch[2];
      const newValue = existing ? `${existing} ${themeClass}` : themeClass;
      return finishWith(
        attrs.replace(exprString, `className={${quote}${newValue}${quote}}`)
      );
    }
  }

  // 4. Other expression form (variable, function call, etc.) — skip.
  const exprAttr = new RegExp(`${attrName}\\s*=\\s*\\{`);
  if (exprAttr.test(attrs)) {
    return {
      changed: false,
      filePath,
      newContent: content,
      message: `<html> uses ${attrName}={...} expression (variable / fn call) in ${filePath} — apply manually.`,
      suggestion: "manual",
    };
  }

  // 5. No className attribute at all — insert as the first attribute.
  return finishWith(` ${attrName}="${themeClass}"${attrs}`);
}

export function wireThemeClass(
  host: HtmlHost,
  content: string,
  themeClass: string
): ThemeClassResult {
  const attrName = host.kind === "jsx-html" ? "className" : "class";
  return wireHtmlOpenTag(host.path, content, themeClass, attrName);
}

export function themeClassInstructions(themeClass: string): string {
  return [
    `Add the default theme class to your <html> element:`,
    "",
    `  <html className="${themeClass}"> ... </html>   (JSX)`,
    `  <html class="${themeClass}"> ... </html>       (plain HTML)`,
    "",
    "This activates the matching `@custom-variant ${dark|light}` rule so",
    "`dark:` / `light:` Tailwind utilities resolve from this point of the tree.",
  ].join("\n");
}
