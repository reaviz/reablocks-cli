import fs from "fs-extra";
import path from "path";
import { Framework } from "../types";

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readDeps(): Record<string, string> {
  try {
    const pkg = fs.readJSONSync(
      path.resolve("package.json")
    ) as PackageJsonShape;
    return {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };
  } catch {
    return {};
  }
}

export function detectFrameworkFromPackageJson(): Framework | null {
  const deps = readDeps();
  if (Object.keys(deps).length === 0) return null;

  if (deps["@react-router/dev"] || deps["@remix-run/react"]) {
    return "react-router";
  }
  if (deps["next"]) {
    return "next";
  }
  if (deps["@redwoodjs/core"] || deps["@redwoodjs/web"]) {
    return "redwood";
  }
  if (deps["@refinedev/core"]) {
    return "refine";
  }
  if (deps["react-scripts"]) {
    return "cra";
  }
  if (deps["vite"]) {
    return "vite";
  }
  return null;
}
