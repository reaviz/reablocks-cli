import fs from "fs-extra";
import path from "path";
import { Framework } from "../types";

export type EntryFileKind =
  | "next-app-layout"
  | "next-pages-app"
  | "react-router-root"
  | "react-root";

export interface EntryFile {
  path: string;
  kind: EntryFileKind;
}

const NEXT_APP_LAYOUTS = [
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/app/layout.js",
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.js",
];

const NEXT_PAGES_APP = [
  "src/pages/_app.tsx",
  "src/pages/_app.jsx",
  "src/pages/_app.js",
  "pages/_app.tsx",
  "pages/_app.jsx",
  "pages/_app.js",
];

const REACT_ROUTER_ROOTS = [
  "app/root.tsx",
  "app/root.jsx",
  "app/root.js",
  "src/root.tsx",
  "src/root.jsx",
  "src/root.js",
];

const VITE_ENTRIES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/main.ts",
  "src/main.js",
];

const CRA_ENTRIES = ["src/index.tsx", "src/index.jsx", "src/index.js"];

const REFINE_ENTRIES = [
  "src/App.tsx",
  "src/App.jsx",
  "src/App.js",
  "src/main.tsx",
  "src/main.jsx",
  "src/main.js",
  "src/index.tsx",
  "src/index.jsx",
  "src/index.js",
];

const REDWOOD_ENTRIES = [
  "web/src/App.tsx",
  "web/src/App.jsx",
  "web/src/App.js",
];

function firstExisting(
  candidates: string[],
  kind: EntryFileKind
): EntryFile | null {
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(candidate))) {
      return { path: candidate, kind };
    }
  }
  return null;
}

function scanAllKnownEntries(): EntryFile | null {
  return (
    firstExisting(REACT_ROUTER_ROOTS, "react-router-root") ??
    firstExisting(NEXT_APP_LAYOUTS, "next-app-layout") ??
    firstExisting(NEXT_PAGES_APP, "next-pages-app") ??
    firstExisting(VITE_ENTRIES, "react-root") ??
    firstExisting(CRA_ENTRIES, "react-root") ??
    firstExisting(REFINE_ENTRIES, "react-root") ??
    firstExisting(REDWOOD_ENTRIES, "react-root")
  );
}

export function findEntryFile(framework: Framework): EntryFile | null {
  switch (framework) {
    case "next":
      return (
        firstExisting(NEXT_APP_LAYOUTS, "next-app-layout") ??
        firstExisting(NEXT_PAGES_APP, "next-pages-app") ??
        scanAllKnownEntries()
      );
    case "react-router":
      return firstExisting(REACT_ROUTER_ROOTS, "react-router-root");
    case "vite":
      return (
        firstExisting(VITE_ENTRIES, "react-root") ??
        firstExisting(REACT_ROUTER_ROOTS, "react-router-root")
      );
    case "cra":
      return firstExisting(CRA_ENTRIES, "react-root");
    case "refine":
      return firstExisting(REFINE_ENTRIES, "react-root");
    case "redwood":
      return firstExisting(REDWOOD_ENTRIES, "react-root");
    case "other":
    default:
      return scanAllKnownEntries();
  }
}
