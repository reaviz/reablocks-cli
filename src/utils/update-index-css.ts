import path from "path";
import fs from "fs-extra";
import { getTailwindCss } from "./get-tailwind-css";

export async function updateIndexCss(indexCssPath: string) {
  const resolvedPath = path.resolve(indexCssPath);
  const fileExists = fs.existsSync(resolvedPath);

  if (!fileExists) {
    console.warn(`⚠️  index.css not found at ${resolvedPath}`);
    return;
  }

  let cssContent = await fs.readFile(resolvedPath, "utf8");
  let lines = cssContent.split("\n");

  // Check if --reablocks-theme: exists in the file
  const reablocksThemeExists = lines.some((line) => line.trim().startsWith("--reablocks-theme:"));

  if (reablocksThemeExists) {
    console.log("⚠️  TailwindCSS is already imported in index.css. Skipping update.");
    return;
  }

  // Check if @import 'tailwindcss' or @import "tailwindcss" already exists
  const tailwindImportRegex = /@import\s+['"]tailwindcss['"];?/;
  const alreadyImportedTailwindcss = lines.some((line) => tailwindImportRegex.test(line.trim()));

  if (alreadyImportedTailwindcss) {
    // Remove the line that contains @import 'tailwindcss' or @import "tailwindcss"
    lines = lines.filter((line) => !tailwindImportRegex.test(line.trim()));
  }
  
  // Remove any existing Tailwind directives
  lines = lines.filter(
    (line) =>
      !line.trim().startsWith("@tailwind base") &&
      !line.trim().startsWith("@tailwind components") &&
      !line.trim().startsWith("@tailwind utilities")
  );

  // Find the last import-like statement
  let lastImportIndex = -1;
  lines.forEach((line, index) => {
    if (
      line.trim().startsWith("@import") ||
      line.trim().startsWith("@use") ||
      line.trim().startsWith("@forward")
    ) {
      lastImportIndex = index;
    }
  });

  const newTailwindCss = getTailwindCss();

  // Insert Tailwind directives after the last import, or at the top if no imports exist
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "", newTailwindCss, "");
  } else {
    lines.unshift(newTailwindCss, "");
  }

  await fs.writeFile(resolvedPath, lines.join("\n"), "utf8");

  console.log(`✅ Tailwind styles updated in ${resolvedPath}`);
}
